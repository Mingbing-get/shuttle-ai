import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { ShuttleAi } from '@shuttle-ai/type'
import { Middleware } from '@koa/router'
import { AgentCluster, readableHook } from '@shuttle-ai/agent'
import { resolve } from 'path'
import { randomUUID } from 'crypto'

import resolverManager from './resolverManager'

function createInitAgentResolver(
  send: (data: ShuttleAi.Ask.InitAgent) => void,
) {
  const initAgentResolver: Record<
    string,
    (value: ShuttleAi.Report.InitAgent['data']['params']) => void
  > = {}

  function addResolver(agentName: string) {
    const { resolve, promise } =
      Promise.withResolvers<ShuttleAi.Report.InitAgent['data']['params']>()

    const id = randomUUID()
    initAgentResolver[id] = resolve

    send({ type: 'initAgent', data: { id, agentName } })

    return promise
  }

  function resolveInitAgent(
    id: string,
    value: ShuttleAi.Report.InitAgent['data']['params'],
  ) {
    if (!initAgentResolver[id]) {
      throw new Error(`not find init agent resolver: ${id}`)
    }

    initAgentResolver[id](value)
    delete initAgentResolver[id]
  }

  return {
    addResolver,
    resolveInitAgent,
  }
}

const invoke: Middleware = async (ctx) => {
  const { prompt } = ctx.request.body as {
    prompt: string
  }

  // 设置响应头为Server-Sent Events格式
  ctx.type = 'application/octet-stream'
  ctx.set('Cache-Control', 'no-cache')
  ctx.set('Connection', 'keep-alive')
  ctx.status = 200

  const { stream, hooks, send, close, resolveConfirmTool, resolveRemoteTool } =
    readableHook()
  const { addResolver, resolveInitAgent } = createInitAgentResolver(send)

  const agentCluster = new AgentCluster({
    hooks: {
      getAgentParams: async (name) => {
        const model = new ChatOpenAI({
          modelName: process.env.OPENAI_DEFAULT_MODEL,
          apiKey: process.env.OPENAI_API_KEY,
          configuration: {
            baseURL: process.env.OPENAI_API_URL,
          },
          streaming: true,
        })

        const remoteInitAgent = await addResolver(name)

        try {
          const configName = name.split('_')[0]
          const config = await import(
            resolve(process.cwd(), `./src/agent/${configName}`)
          )

          const systemPromptList = [
            config.default?.systemPrompt || '',
            remoteInitAgent.systemPrompt || '',
          ].filter(Boolean)

          return {
            systemPrompt:
              systemPromptList.length > 0
                ? systemPromptList.join('\n')
                : undefined,
            tools: [
              ...(config.default?.tools || []),
              ...(remoteInitAgent.tools || []),
            ],
            subAgents: [
              ...(config.default?.subAgents || []),
              ...(remoteInitAgent.subAgents || []),
            ],
            model,
          }
        } catch (error) {
          return {
            ...remoteInitAgent,
            model,
          }
        }
      },
      ...hooks,
    },
  })

  resolverManager.addAgentResolver(agentCluster.id, {
    resolveConfirmTool,
    resolveRemoteTool,
    resolveInitAgent,
  })

  function closeAll() {
    send({ type: 'endWork', data: { workId: agentCluster.id } })
    close()
    agentCluster.stop()
    resolverManager.removeAgentResolver(agentCluster.id)
  }

  ctx.req.on('close', closeAll)

  // 由于是流式响应，不返回常规的响应体
  ctx.body = stream

  send({ type: 'startWork', data: { workId: agentCluster.id } })
  agentCluster.invoke(prompt).then(closeAll)
}

export default invoke
