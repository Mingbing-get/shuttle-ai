import { Runnable } from '@langchain/core/runnables'
import { createAgent } from 'langchain'
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages'
import { ClientTool, tool } from '@langchain/core/tools'
import { ShuttleAi } from '@shuttle-ai/type'
import { MCPClient } from '@shuttle-ai/mcp-client'
import { SkillLoader } from '@shuttle-ai/skill'
import { z } from 'zod'
import { randomUUID } from 'crypto'

import { dynamicToolInterceptorMiddleware } from '../middleware'
import { LLMMessage } from '../callback'

export default class AgentCluster extends Runnable {
  static MAIN_AGENT_NAME = 'main_agent'
  static CALL_SUB_AGENT_NAME = 'call_sub_agent'
  static CALL_LAZY_AGENT_NAME = 'call_lazy_agent'
  static CALL_LAZY_TOOL_NAME = 'call_lazy_tool'
  static GET_TOOL_PARAMS_NAME = 'get_tool_params'

  static READ_SKILL_INSTRUCTION_NAME = 'read_skill_instruction'
  static READ_SKILL_REFERENCE_NAME = 'read_skill_reference'
  static EXECUTE_SKILL_SCRIPT_NAME = 'execute_skill_script'

  readonly lc_namespace = ['shuttle-ai', 'agent', 'cluster']
  readonly id: string

  private tokenUseage: ShuttleAi.Cluster.TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  }
  private messages: ShuttleAi.Message.Define[] = []
  private lazyTools: Record<string, (ShuttleAi.Tool.Define | ClientTool)[]> = {}
  readonly abortController = new AbortController()

  constructor(readonly options: ShuttleAi.Cluster.Options) {
    super()

    this.id = options.id || randomUUID()

    options.single?.addEventListener('abort', () => {
      this.stop()
    })
  }

  addMessage(message: ShuttleAi.Message.Define) {
    this.messages.push(message)
    this.options.messageCollector?.saveMessage(message)
  }

  async invoke(
    input: string,
    options?: Omit<
      ShuttleAi.Cluster.InvokeOptions,
      keyof ShuttleAi.Cluster.SystemContext
    >,
  ): Promise<string> {
    const params = await this.options.hooks.onAgentStart({
      agentId: this.id,
      agentName: AgentCluster.MAIN_AGENT_NAME,
      content: input,
    })
    const agent = await this.createAgent(
      params,
      this.id,
      AgentCluster.MAIN_AGENT_NAME,
    )

    this.addMessage({
      id: randomUUID(),
      workId: this.id,
      agentId: this.id,
      role: 'user',
      content: input,
    })
    const oldMessages = options?.revoke
      ? await this.revokeMessages(this.id)
      : []
    const result = agent.streamEvents(
      {
        messages: [...oldMessages, { role: 'user', content: input }],
      },
      {
        ...this.options.runnableOptions,
        signal: this.abortController.signal,
        context: {
          ...(options?.context || {}),
          _agentCluster: this,
          _agentId: this.id,
          _agentName: AgentCluster.MAIN_AGENT_NAME,
        },
        callbacks: [
          new LLMMessage({
            agentCluster: this,
            agentId: this.id,
          }),
        ],
      },
    )

    await Array.fromAsync(result)

    this.options.hooks.onAgentEnd?.(this.id)
    const lastAiMessage = this.getLastAiMessage(this.id)
    return lastAiMessage?.content || ''
  }

  stop(resign: string = 'stop') {
    this.abortController.abort(resign)
  }

  async createAgent(
    {
      tools,
      subAgents,
      lazyTools: _lazyTools,
      lazyAgents,
      middleware,
      systemPrompt,
      skillConfig,
      mcps,
      ...extra
    }: ShuttleAi.Cluster.AgentStartReturn,
    agentId: string,
    agentName: string,
  ) {
    const mcpTools = await this.loadMCPTools(mcps)
    const lazyTools = [...(_lazyTools || []), ...mcpTools]

    const normalizedTools: ClientTool[] = []
    if (tools?.length) {
      normalizedTools.push(...this.normalizationTools(tools))
    }
    if (subAgents?.length) {
      normalizedTools.push(this.subAgentToDynamicTool(subAgents, agentId))
    }

    const systemPrompts: string[] = []
    if (systemPrompt) {
      systemPrompts.push(
        typeof systemPrompt === 'string'
          ? systemPrompt
          : (systemPrompt.content as string),
      )
    }
    if (lazyTools?.length) {
      this.lazyTools[agentName] = lazyTools
      systemPrompts.push(this.lazyToolsToSystemPrompt(lazyTools, agentName))
    }

    if (lazyAgents?.length) {
      systemPrompts.push(this.lazyAgentToSystemPrompt(lazyAgents))
      normalizedTools.push(this.callLazyAgentTool(agentId))
    }

    if (lazyTools?.length || lazyAgents?.length) {
      normalizedTools.push(
        this.getLazyToolParamsTool(),
        this.callLazyToolTool(),
      )
    }

    const skillInfo = await this.getSkillPromptAndTools(skillConfig)
    if (skillInfo.prompt) {
      systemPrompts.push(skillInfo.prompt)
    }
    if (skillInfo.tools.length > 0) {
      normalizedTools.push(...skillInfo.tools)
    }

    const agent = createAgent({
      ...extra,
      systemPrompt: systemPrompts.join('\n'),
      middleware: [
        ...(middleware || []),
        dynamicToolInterceptorMiddleware,
      ] as any,
      tools: normalizedTools,
    })

    return agent
  }

  lazyToolsToSystemPrompt(
    lazyTools: (ShuttleAi.Tool.Define | ClientTool)[],
    agentName: string,
  ) {
    const toolsTip = lazyTools
      .map((tool) => `${tool.name}: ${tool.description}`)
      .join('\n')

    return `你拥有调用懒加载工具的能力, **注意**: 你**必须**按以下步骤来调用懒加载工具:
1. 先调用${AgentCluster.GET_TOOL_PARAMS_NAME}工具来获取懒加载工具的参数定义
2. 调用${AgentCluster.CALL_LAZY_TOOL_NAME}工具来调用懒加载的工具。
以下懒加载工具的agentName: ${agentName}
可用的懒加载工具: \n${toolsTip}`
  }

  lazyAgentToSystemPrompt(lazyAgents: ShuttleAi.SubAgent.Define[]) {
    const agentsTip = lazyAgents
      .map((agent) => `${agent.name}: ${agent.description}`)
      .join('\n')

    return `你拥有扩展其他智能体的能力, 可以调用${AgentCluster.CALL_LAZY_AGENT_NAME}工具来扩展其他智能体的能力。
可扩展的能力有: \n${agentsTip}`
  }

  normalizationTools(tools: (ShuttleAi.Tool.Define | ClientTool)[]) {
    return tools.map((tool) => {
      if ('lc_namespace' in tool || 'lc_name' in tool) {
        return tool as ClientTool
      }

      return this.customToolToDynamicTool(tool)
    })
  }

  customToolToDynamicTool(_tool: ShuttleAi.Tool.Define) {
    return tool((args?: Record<string, any>) => {
      return ''
    }, _tool as any)
  }

  subAgentToDynamicTool(
    subAgents: ShuttleAi.SubAgent.Define[],
    agentId: string,
  ) {
    return tool(
      async (params: { subAgentName: string; request: string }, request) => {
        const subAgent = subAgents.find(
          (agent) => agent.name === params.subAgentName,
        )
        if (!subAgent) {
          throw new Error(`Sub-agent ${params.subAgentName} not found.`)
        }

        const parentLastAiMessage = this.getLastAiMessage(agentId)
        const currentAgentId: string = request.toolCall.id
        const createAgentParams = await this.options.hooks.onAgentStart({
          agentId: currentAgentId,
          agentName: params.subAgentName,
          beloneMessageId: parentLastAiMessage?.id,
          parentAgentId: agentId,
          content: params.request,
        })
        const agent = await this.createAgent(
          createAgentParams,
          currentAgentId,
          params.subAgentName,
        )

        this.addMessage({
          id: randomUUID(),
          workId: this.id,
          agentId: currentAgentId,
          role: 'user',
          content: params.request,
        })

        const result = agent.streamEvents(
          {
            messages: [{ role: 'user', content: params.request }],
          },
          {
            ...this.options.runnableOptions,
            signal: this.abortController.signal,
            context: {
              ...(request.context || {}),
              _agentCluster: this,
              _agentId: currentAgentId,
              _agentName: params.subAgentName,
              _parentAgentId: agentId,
            },
            callbacks: [
              new LLMMessage({
                agentCluster: this,
                agentId: currentAgentId,
              }),
            ],
          },
        )

        await Array.fromAsync(result)
        this.options.hooks.onAgentEnd?.(currentAgentId)

        const lastAiMessage = this.getLastAiMessage(currentAgentId)
        return lastAiMessage?.content || ''
      },
      {
        name: AgentCluster.CALL_SUB_AGENT_NAME,
        description: `Call a sub-agent to handle the user request.
      The sub-agents are: 
      ${subAgents.map((agent) => `- ${agent.name}: ${agent.description}`).join('\n')}
      `,
        schema: z.object({
          subAgentName: z
            .literal(subAgents.map((agent) => agent.name))
            .describe('The name of the sub-agent to call.'),
          request: z.string().describe('The request to send to the sub-agent.'),
        }),
        extras: {
          scope: 'autoRun',
          skipReport: true,
        },
      },
    )
  }

  getLazyToolParamsTool() {
    return tool(
      async ({ agentName, toolName }) => {
        const lazyTools = this.lazyTools[agentName]
        if (!lazyTools) {
          throw new Error(`Agent ${agentName} has no lazy tools.`)
        }

        const tool = lazyTools.find((tool) => tool.name === toolName)
        if (!tool) {
          throw new Error(`Tool ${toolName} not found in agent ${agentName}.`)
        }

        if (tool.schema instanceof z.ZodType) {
          return tool.schema.toJSONSchema()
        }

        return tool.schema
      },
      {
        name: AgentCluster.GET_TOOL_PARAMS_NAME,
        description: `Get the parameters of a lazy-loading tool.`,
        schema: z.object({
          agentName: z
            .string()
            .describe('The name of the tool in the lazy agent.'),
          toolName: z.string().describe('The name of the tool to extend.'),
        }),
        extras: {
          scope: 'autoRun',
          skipReport: true,
        },
      },
    )
  }

  callLazyToolTool() {
    return tool(async () => '', {
      name: AgentCluster.CALL_LAZY_TOOL_NAME,
      description: `Call a lazy-loading tool.`,
      schema: z.object({
        agentName: z
          .string()
          .describe('The name of the tool in the lazy agent.'),
        toolName: z.string().describe('The name of the tool to extend.'),
        args: z
          .object({})
          .catchall(z.any())
          .describe('The arguments to pass to the tool.'),
      }),
      extras: {
        scope: 'autoRun',
        skipReport: true,
      },
    })
  }

  callLazyAgentTool(agentId: string) {
    return tool(
      async ({ agentName }, request) => {
        const currentAgentId: string = request.toolCall.id
        const createAgentParams = await this.options.hooks.onAgentStart({
          agentId: currentAgentId,
          agentName,
          parentAgentId: agentId,
          content: '',
          isLazy: true,
        })

        const mcpTools = await this.loadMCPTools(createAgentParams.mcps)
        const lazyTools = [...(createAgentParams.lazyTools || []), ...mcpTools]
        const prompts = []
        if (lazyTools.length) {
          this.lazyTools[agentName] = lazyTools
          prompts.push(this.lazyToolsToSystemPrompt(lazyTools, agentName))
        }
        if (createAgentParams.lazyAgents?.length) {
          prompts.push(
            this.lazyAgentToSystemPrompt(createAgentParams.lazyAgents),
          )
        }

        return prompts.join('\n')
      },
      {
        name: AgentCluster.CALL_LAZY_AGENT_NAME,
        description: `Extend lazy-loading tools.`,
        schema: z.object({
          agentName: z
            .string()
            .describe('The name of the lazy agent to extend.'),
        }),
        extras: {
          scope: 'autoRun',
          skipReport: true,
        },
      },
    )
  }

  getLastAiMessage(agentId: string) {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const message = this.messages[i]
      if (message.agentId === agentId && message.role === 'assistant') {
        return message
      }
    }
  }

  getMessages() {
    return this.messages
  }

  getLazyTool(agentName: string, toolName: string) {
    const lazyTools = this.lazyTools[agentName]
    if (!lazyTools) {
      throw new Error(`Agent ${agentName} has no lazy tools.`)
    }

    const tool = lazyTools.find((tool) => tool.name === toolName)
    if (!tool) {
      throw new Error(`Tool ${toolName} not found in agent ${agentName}.`)
    }

    return tool
  }

  getLazyToolByToolName(toolName: string) {
    for (const key in this.lazyTools) {
      const tools = this.lazyTools[key]
      for (const tool of tools) {
        if (tool.name === toolName) {
          return tool
        }
      }
    }
  }

  private async getSkillPromptAndTools(
    skillConfig?: ShuttleAi.Cluster.SkillConfig,
  ) {
    if (!skillConfig) {
      return {
        prompt: '',
        tools: [],
      }
    }

    const skillLoader =
      'loader' in skillConfig
        ? skillConfig.loader
        : new SkillLoader(skillConfig)

    await skillLoader.loadAll()
    const allSkillMeta = skillLoader.getAllSkillMeta()
    if (allSkillMeta.length === 0) {
      return {
        prompt: '',
        tools: [],
      }
    }

    const readSkillInstructionTool = tool(
      async ({ skillName }) => {
        const skill = skillLoader.getSkillByName(skillName)
        if (!skill) {
          throw new Error(`Skill ${skillName} not found.`)
        }
        return skill.instruction
      },
      {
        name: AgentCluster.READ_SKILL_INSTRUCTION_NAME,
        description: 'Read the complete skill document',
        schema: z.object({
          skillName: z.string().describe('The name of the skill to read.'),
        }),
        extras: {
          scope: 'read',
        },
      },
    )
    const readSkillReference = tool(
      async ({ skillName, path }) => {
        const content = await skillLoader.getReference(skillName, path)
        if (!content) {
          throw new Error(`Reference ${path} not found in skill ${skillName}.`)
        }
        return JSON.stringify({
          skillName,
          refContent: content,
        })
      },
      {
        name: AgentCluster.READ_SKILL_REFERENCE_NAME,
        description: 'Read the skill references',
        schema: z.object({
          skillName: z.string().describe('The name of the skill to read.'),
          path: z.string().describe('The path of the skill reference.'),
        }),
        extras: {
          scope: 'read',
        },
      },
    )
    const executeSkillScript = tool(
      async ({ skillName, path, args }) => {
        return await skillLoader.executeScript(skillName, path, args)
      },
      {
        name: AgentCluster.EXECUTE_SKILL_SCRIPT_NAME,
        description: 'Execute the skill script',
        schema: z.object({
          skillName: z.string().describe('The name of the skill to execute.'),
          path: z.string().describe('The path of the script to execute.'),
          args: z
            .object({})
            .catchall(z.any())
            .describe('The arguments to pass to the script.'),
        }),
        extras: {
          scope: 'write',
        },
      },
    )

    return {
      prompt: `你拥有扩展skill(技能)的能力，你需**仔细思考**用户的需求，选择合适的skill来完成任务，skill的使用步骤如下：
1、当你需要了解某个skill的详细信息时，调用${AgentCluster.READ_SKILL_INSTRUCTION_NAME}来读取完整的skill文档
2、当你需要了解某个skill的引用信息时，调用${AgentCluster.READ_SKILL_REFERENCE_NAME}来读取skill的引用
3、当你需要执行某个skill的脚本时，调用${AgentCluster.EXECUTE_SKILL_SCRIPT_NAME}来执行skill的脚本
以下展示了所有可用skill的名称和基础说明: 
${allSkillMeta.map((meta) => JSON.stringify(meta)).join('\n')}`,
      tools: [readSkillInstructionTool, readSkillReference, executeSkillScript],
    }
  }

  private async revokeMessages(
    agentId: string,
  ): Promise<(HumanMessage | AIMessage | ToolMessage)[]> {
    if (!this.options.messageCollector) return []

    const messages = await this.options.messageCollector.getMessagesByAgentId(
      this.id,
      agentId,
    )

    const willLoadLazyAgentNames: string[] = []

    const historyMessages = messages.map((message) => {
      if (message.role === 'user') {
        return new HumanMessage(message.content)
      }

      if (message.role === 'assistant') {
        message.toolCalls?.forEach((toolCall) => {
          if (toolCall.name !== AgentCluster.CALL_LAZY_AGENT_NAME) return

          const agentName = toolCall.args?.agentName
          if (agentName && !willLoadLazyAgentNames.includes(agentName)) {
            willLoadLazyAgentNames.push(agentName)
          }
        })

        return new AIMessage({
          content: message.content,
          tool_calls: message.toolCalls,
        })
      }

      const result = message.result || message.confirm?.result

      return new ToolMessage({
        content:
          (result?.type === 'success'
            ? this.anyToString(result.content)
            : result?.reason) || '',
        tool_call_id: message.id,
      })
    })

    if (willLoadLazyAgentNames.length > 0) {
      const loadAgentsPromise = willLoadLazyAgentNames.map(
        async (agentName) => {
          const createAgentParams = await this.options.hooks.onAgentStart({
            agentId: agentId,
            agentName,
            parentAgentId: agentId,
            content: '',
            isLazy: true,
          })
          const mcpTools = await this.loadMCPTools(createAgentParams.mcps)
          const lazyTools = [
            ...(createAgentParams.lazyTools || []),
            ...mcpTools,
          ]

          if (lazyTools.length) {
            this.lazyTools[agentName] = lazyTools
          }
        },
      )

      await Promise.all(loadAgentsPromise)
    }

    return historyMessages
  }

  private anyToString(v: any) {
    if (typeof v === 'object') return JSON.stringify(v)
    return v
  }

  private async loadMCPTools(mcps?: ShuttleAi.MCP.ServerConfig[]) {
    if (!mcps?.length) return []

    const client = new MCPClient({
      servers: mcps,
    })

    await client.connect()

    const mcpToolMap = await client.listTools()

    const tools: ClientTool[] = []

    for (const [serverName, mcpTools] of mcpToolMap.entries()) {
      mcpTools.forEach((mcpTool) => {
        tools.push(
          tool(
            async (args) => {
              const res = await client.callTool(serverName, {
                name: mcpTool.name,
                arguments: args as any,
              })

              return JSON.stringify(res)
            },
            {
              name: mcpTool.name,
              description: mcpTool.description,
              schema: mcpTool.inputSchema,
              extras: {
                scope: 'autoRun',
              },
            },
          ),
        )
      })
    }

    return tools
  }

  spendToken(tokenUsage: ShuttleAi.Cluster.TokenUsage) {
    this.tokenUseage.promptTokens += tokenUsage.promptTokens
    this.tokenUseage.completionTokens += tokenUsage.completionTokens
    this.tokenUseage.totalTokens += tokenUsage.totalTokens
  }

  getTokenUsage() {
    return { ...this.tokenUseage }
  }
}
