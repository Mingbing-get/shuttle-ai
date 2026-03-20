import { Readable } from 'stream'
import { ShuttleAi } from '@shuttle-ai/type'

interface ReadableHookLink extends Omit<
  ShuttleAi.Cluster.Hooks,
  'onAgentStart' | 'onToolStart'
> {
  onAgentStart?: (options: ShuttleAi.Ask.AgentStart['data']) => void
  onToolStart?: (tool: ShuttleAi.Message.AITool) => void
}

interface Options {
  getAgentParamsFromServer: (
    agentName: string,
  ) => Promise<ShuttleAi.Cluster.AgentStartReturn>
  hookLinks?: ReadableHookLink[]
}

export default class StreamReadableHook {
  private initAgentResolver: Record<
    string,
    (value: ShuttleAi.Report.AgentStart['data']['params']) => void
  > = {}
  private confirmToolResolver: Record<
    string,
    (value: ShuttleAi.Tool.ConfirmResult) => void
  > = {}

  private streams: Readable[] = []

  private lastSendTime = Date.now()
  private hertInterval: NodeJS.Timeout

  readonly hooks: ShuttleAi.Cluster.Hooks

  constructor(private options: Options) {
    this.hertInterval = setInterval(() => {
      if (Date.now() - this.lastSendTime > 20 * 1000) {
        this.send({ type: 'ping', data: undefined })
      }
    }, 30 * 1000)

    this.hooks = {
      onChunk: (chunk) => {
        this.triggerHookLinks('onChunk', [chunk])
        this.send({ type: 'chunk', data: { chunk } })
      },
      onAgentStart: async (options) => {
        this.triggerHookLinks('onAgentStart', [options])
        this.send({
          type: 'agentStart',
          data: options,
        })

        const { promise, resolve } =
          Promise.withResolvers<ShuttleAi.Report.AgentStart['data']['params']>()

        this.initAgentResolver[options.agentId] = resolve

        const remoteParams = await promise
        const serverParams = await this.options.getAgentParamsFromServer(
          options.agentName,
        )

        const systemPromptList = [
          serverParams?.systemPrompt || '',
          remoteParams.systemPrompt || '',
        ].filter(Boolean)

        const tools = (remoteParams.tools || []).map((tool) => ({
          ...tool,
          extras: {
            ...tool.extras,
            remote: true,
          },
        }))

        const lazyTools = (remoteParams.lazyTools || []).map((tool) => ({
          ...tool,
          extras: {
            ...tool.extras,
            remote: true,
          },
        }))

        return {
          ...serverParams,
          systemPrompt:
            systemPromptList.length > 0
              ? systemPromptList.join('\n')
              : undefined,
          tools: [...(serverParams?.tools || []), ...tools],
          subAgents: [
            ...(serverParams?.subAgents || []),
            ...(remoteParams.subAgents || []),
          ],
          lazyAgents: [
            ...(serverParams?.lazyAgents || []),
            ...(remoteParams.lazyAgents || []),
          ],
          lazyTools: [...(serverParams?.lazyTools || []), ...lazyTools],
          mcps: [...(serverParams?.mcps || []), ...(remoteParams.mcps || [])],
        }
      },
      onAgentEnd: (agentId) => {
        this.triggerHookLinks('onAgentEnd', [agentId])
        this.send({ type: 'agentEnd', data: { agentId } })
      },
      onToolStart: async (tool) => {
        this.triggerHookLinks('onToolStart', [tool])
        this.send({ type: 'toolStart', data: { tool } })

        if (tool.needConfirm) {
          const { resolve, promise } =
            Promise.withResolvers<ShuttleAi.Tool.ConfirmResult>()
          this.confirmToolResolver[tool.toolCall.id] = resolve

          return promise
        }

        return {
          type: 'confirm',
        }
      },
      onToolEnd: (toolPath, toolResult) => {
        this.triggerHookLinks('onToolEnd', [toolPath, toolResult])
        this.send({ type: 'toolEnd', data: { toolPath, toolResult } })
      },
    }
  }

  send(data: ShuttleAi.Ask.Define) {
    this.streams.forEach((stream) => stream.push(`${JSON.stringify(data)}\n\n`))
    this.lastSendTime = Date.now()
  }

  close() {
    this.streams.forEach((stream) => stream.push(null))
    clearInterval(this.hertInterval)
  }

  resolveConfirmTool(id: string, value: ShuttleAi.Tool.ConfirmResult) {
    if (!this.confirmToolResolver[id]) {
      throw new Error(`not find confirm tool resolver: ${id}`)
    }

    this.confirmToolResolver[id](value)
    delete this.confirmToolResolver[id]
  }

  resolveAgentStart(
    id: string,
    value: ShuttleAi.Report.AgentStart['data']['params'],
  ) {
    if (!this.initAgentResolver[id]) {
      throw new Error(`not find init agent resolver: ${id}`)
    }

    this.initAgentResolver[id](value)
    delete this.initAgentResolver[id]
  }

  createStream() {
    const stream = new Readable({
      read() {},
    })

    stream.on('close', () => {
      console.log(stream.destroyed)
      this.streams = this.streams.filter((item) => item !== stream)
    })

    this.streams.push(stream)
    return stream
  }

  private triggerHookLinks<N extends keyof ReadableHookLink>(
    name: N,
    args: Parameters<Required<ReadableHookLink>[N]>,
  ) {
    this.options.hookLinks?.forEach((hook) => (hook[name] as any)?.(...args))
  }
}
