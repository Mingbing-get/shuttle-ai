import { Runnable } from '@langchain/core/runnables'
import { createAgent, CreateAgentParams } from 'langchain'
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages'
import { ClientTool, tool } from '@langchain/core/tools'
import { ShuttleAi } from '@shuttle-ai/type'
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

  readonly lc_namespace = ['shuttle-ai', 'agent', 'cluster']
  readonly id: string

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
    const agent = this.createAgent(
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
    const oldMessages = await this.revokeMessages(this.id)
    const result = agent.streamEvents(
      {
        messages: [...oldMessages, { role: 'user', content: input }],
      },
      {
        signal: this.abortController.signal,
        context: {
          ...(options?.context || {}),
          _agentCluster: this,
          _agentId: this.id,
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

  createAgent(
    {
      tools,
      subAgents,
      lazyTools,
      lazyAgents,
      middleware,
      systemPrompt,
      ...extra
    }: ShuttleAi.Cluster.ToolsWithSubAgents & Omit<CreateAgentParams, 'tools'>,
    agentId: string,
    agentName: string,
  ) {
    const normalizedTools: ClientTool[] = [
      this.getLazyToolParamsTool(),
      this.callLazyToolTool(),
      this.callLazyAgentTool(agentId),
    ]
    if (tools?.length) {
      normalizedTools.push(...this.normalizationTools(tools))
    }
    if (subAgents?.length) {
      normalizedTools.push(this.subAgentToDynamicTool(subAgents, agentId))
    }

    if (lazyTools?.length) {
      this.lazyTools[agentName] = lazyTools
      systemPrompt = [
        systemPrompt || '',
        this.lazyToolsToSystemPrompt(lazyTools, agentName),
      ].join('\n')
    }

    if (lazyAgents?.length) {
      systemPrompt = [
        systemPrompt || '',
        this.lazyAgentToSystemPrompt(lazyAgents),
      ].join('\n')
    }

    const agent = createAgent({
      ...extra,
      systemPrompt,
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

    return `你拥有调用懒加载工具的能力, 可以按以下步骤来调用懒加载工具:
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
        const agent = this.createAgent(
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
            signal: this.abortController.signal,
            context: {
              ...(request.context || {}),
              _agentCluster: this,
              _agentId: currentAgentId,
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

        const prompts = []
        if (createAgentParams.lazyTools?.length) {
          this.lazyTools[agentName] = createAgentParams.lazyTools
          prompts.push(
            this.lazyToolsToSystemPrompt(
              createAgentParams.lazyTools,
              agentName,
            ),
          )
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

          if (createAgentParams.lazyTools?.length) {
            this.lazyTools[agentName] = createAgentParams.lazyTools
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
}
