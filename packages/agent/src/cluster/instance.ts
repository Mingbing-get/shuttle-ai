import { Runnable } from '@langchain/core/runnables'
import { createAgent, CreateAgentParams } from 'langchain'
import { ClientTool, tool } from '@langchain/core/tools'
import { ShuttleAi } from '@shuttle-ai/type'
import { z } from 'zod'
import { randomUUID } from 'crypto'

import { dynamicToolInterceptorMiddleware } from '../middleware'
import { MessageCollector } from '../callback'

export default class AgentCluster extends Runnable {
  static MAIN_AGENT_NAME = 'main_agent'

  readonly lc_namespace = ['shuttle-ai', 'agent', 'cluster']
  readonly id: string

  private messages: ShuttleAi.Message.Define[] = []
  private abortController = new AbortController()

  constructor(readonly options: ShuttleAi.Cluster.Options) {
    super()

    this.id = options.id || randomUUID()

    options.single?.addEventListener('abort', () => {
      this.stop()
    })
  }

  addMessage(message: ShuttleAi.Message.Define) {
    this.messages.push(message)
  }

  async invoke(input: string, options?: any): Promise<string> {
    const params = await this.options.hooks.getAgentParams(
      AgentCluster.MAIN_AGENT_NAME,
    )
    const agent = this.createAgent(params, this.id)

    this.addMessage({
      id: randomUUID(),
      workId: this.id,
      agentId: this.id,
      role: 'user',
      content: input,
    })
    const result = agent.streamEvents(
      {
        messages: [
          ...(options?.messages || []),
          { role: 'user', content: input },
        ],
      },
      {
        signal: this.abortController.signal,
        context: {
          ...(options?.context || {}),
          _agentCluster: this,
          _agentId: this.id,
        },
        callbacks: [
          new MessageCollector({
            agentCluster: this,
            agentId: this.id,
          }),
        ],
      },
    )

    await Array.fromAsync(result)

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
      return this.options.hooks.onRunRemoteTool?.(_tool.name, args)
    }, _tool as any)
  }

  subAgentToDynamicTool(
    subAgents: ShuttleAi.SubAgent.Define[],
    agentId: string,
  ) {
    return tool(
      async (params: { subAgentName: string; request: string }) => {
        const subAgent = subAgents.find(
          (agent) => agent.name === params.subAgentName,
        )
        if (!subAgent) {
          throw new Error(`Sub-agent ${params.subAgentName} not found.`)
        }

        const createAgentParams = await this.options.hooks.getAgentParams(
          params.subAgentName,
        )
        const currentAgentId = randomUUID()
        const agent = this.createAgent(createAgentParams, currentAgentId)

        this.options.hooks.onSubAgentStart?.(
          currentAgentId,
          agentId,
          params.request,
        )
        this.addMessage({
          id: randomUUID(),
          workId: this.id,
          agentId: currentAgentId,
          parentAgentId: agentId,
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
              _agentCluster: this,
              _agentId: currentAgentId,
              _parentAgentId: agentId,
            },
            callbacks: [
              new MessageCollector({
                agentCluster: this,
                agentId: currentAgentId,
                parentAgentId: agentId,
              }),
            ],
          },
        )

        await Array.fromAsync(result)
        this.options.hooks.onSubAgentEnd?.(currentAgentId)

        const lastAiMessage = this.getLastAiMessage(currentAgentId)
        return lastAiMessage?.content || ''
      },
      {
        name: 'call_sub_agent',
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
}
