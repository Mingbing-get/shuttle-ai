import { Readable } from 'stream'
import { randomUUID } from 'crypto'
import { ShuttleAi } from '@shuttle-ai/type'
import { CreateAgentParams } from 'langchain'

export default function createReadableHook(
  getAgentParamsFromServer: (
    agentName: string,
  ) => Promise<
    ShuttleAi.Cluster.ToolsWithSubAgents & Omit<CreateAgentParams, 'tools'>
  >,
) {
  const initAgentResolver: Record<
    string,
    (value: ShuttleAi.Report.AgentStart['data']['params']) => void
  > = {}
  const remoteToolResolver: Record<string, (value: any) => void> = {}
  const confirmToolResolver: Record<
    string,
    (value: ShuttleAi.Tool.ConfirmResult) => void
  > = {}

  const stream = new Readable({
    read() {},
  })
  let lastSendTime = Date.now()
  function send(data: ShuttleAi.Ask.Define) {
    stream.push(`${JSON.stringify(data)}\n\n`)
    lastSendTime = Date.now()
  }

  const interval = setInterval(() => {
    if (Date.now() - lastSendTime > 20 * 1000) {
      send({ type: 'ping', data: undefined })
    }
  }, 30 * 1000)

  function close() {
    stream.push(null)
    clearInterval(interval)
  }

  function resolveRemoteTool(id: string, value: any) {
    if (!remoteToolResolver[id]) {
      throw new Error(`not find remote tool resolver: ${id}`)
    }

    remoteToolResolver[id](value)
    delete remoteToolResolver[id]
  }

  function resolveConfirmTool(id: string, value: ShuttleAi.Tool.ConfirmResult) {
    if (!confirmToolResolver[id]) {
      throw new Error(`not find confirm tool resolver: ${id}`)
    }

    confirmToolResolver[id](value)
    delete confirmToolResolver[id]
  }

  function resolveAgentStart(
    id: string,
    value: ShuttleAi.Report.AgentStart['data']['params'],
  ) {
    if (!initAgentResolver[id]) {
      throw new Error(`not find init agent resolver: ${id}`)
    }

    initAgentResolver[id](value)
    delete initAgentResolver[id]
  }

  const hooks: ShuttleAi.Cluster.Hooks = {
    onChunk(chunk) {
      send({ type: 'chunk', data: { chunk } })
    },
    async onAgentStart(options) {
      send({
        type: 'agentStart',
        data: options,
      })

      const { promise, resolve } =
        Promise.withResolvers<ShuttleAi.Report.AgentStart['data']['params']>()

      initAgentResolver[options.agentId] = resolve

      const remoteParams = await promise
      const serverParams = await getAgentParamsFromServer(options.agentName)

      const systemPromptList = [
        serverParams?.systemPrompt || '',
        remoteParams.systemPrompt || '',
      ].filter(Boolean)

      return {
        ...serverParams,
        systemPrompt:
          systemPromptList.length > 0 ? systemPromptList.join('\n') : undefined,
        tools: [...(serverParams?.tools || []), ...(remoteParams.tools || [])],
        subAgents: [
          ...(serverParams?.subAgents || []),
          ...(remoteParams.subAgents || []),
        ],
      }
    },
    onAgentEnd(agentId) {
      send({ type: 'agentEnd', data: { agentId } })
    },
    onToolStart(tool) {
      send({ type: 'toolStart', data: { tool } })
    },
    onToolEnd(toolPath, toolResult) {
      send({ type: 'toolEnd', data: { toolPath, toolResult } })
    },
    async onRunRemoteTool(toolName, args) {
      const runId = randomUUID()
      send({ type: 'runRemoteTool', data: { runId, toolName, args } })

      const { resolve, promise } = Promise.withResolvers<any>()
      remoteToolResolver[runId] = resolve

      return promise
    },
    async onToolConfirm(toolPath) {
      send({ type: 'toolConfirm', data: { toolPath } })

      const { resolve, promise } =
        Promise.withResolvers<ShuttleAi.Tool.ConfirmResult>()
      confirmToolResolver[toolPath.messageId] = resolve

      return promise
    },
  }

  return {
    hooks,
    stream,
    send,
    close,
    resolveRemoteTool,
    resolveConfirmTool,
    resolveAgentStart,
  }
}
