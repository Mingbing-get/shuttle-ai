import { Runnable } from '@langchain/core/runnables'
import { createAgent, CreateAgentParams, todoListMiddleware } from 'langchain'
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

  readonly lc_namespace = ['shuttle-ai', 'agent', 'cluster']
  readonly id: string

  private messages: ShuttleAi.Message.Define[] = []
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
    const agent = this.createAgent(params, this.id)

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
      middleware,
      ...extra
    }: ShuttleAi.Cluster.ToolsWithSubAgents & Omit<CreateAgentParams, 'tools'>,
    agentId: string,
  ) {
    let normalizedTools: ClientTool[] = []
    if (tools?.length) {
      normalizedTools = this.normalizationTools(tools)
    }
    if (subAgents?.length) {
      normalizedTools.push(this.subAgentToDynamicTool(subAgents, agentId))
    }

    const agent = createAgent({
      ...extra,
      middleware: [
        ...(middleware || []),
        dynamicToolInterceptorMiddleware,
        todoListMiddleware(),
      ] as any,
      tools: normalizedTools,
    })

    return agent
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
        const agent = this.createAgent(createAgentParams, currentAgentId)

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

  private async revokeMessages(
    agentId: string,
  ): Promise<(HumanMessage | AIMessage | ToolMessage)[]> {
    if (!this.options.messageCollector) return []

    const messages = await this.options.messageCollector.getMessagesByAgentId(
      this.id,
      agentId,
    )

    return messages.map((message) => {
      if (message.role === 'user') {
        return new HumanMessage(message.content)
      }

      if (message.role === 'assistant') {
        return new AIMessage({
          content: message.content,
          tool_calls: message.toolCalls,
        })
      }

      return new ToolMessage({
        content: message.content || message.confirm?.result,
        tool_call_id: message.id,
      })
    })
  }
}
