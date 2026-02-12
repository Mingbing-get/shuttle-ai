import 'dotenv/config'
import { CreateAgentParams } from 'langchain'
import { ChatOpenAI } from '@langchain/openai'
import { Middleware } from '@koa/router'
import { ShuttleAi } from '@shuttle-ai/type'
import {
  AgentCluster,
  readableHook,
  FileMessageCollector,
} from '@shuttle-ai/agent'
import { resolve } from 'path'

import resolverManager from './resolverManager'

async function loadAgent(
  name: string,
): Promise<
  ShuttleAi.Cluster.ToolsWithSubAgents & Omit<CreateAgentParams, 'tools'>
> {
  const model = new ChatOpenAI({
    modelName: process.env.OPENAI_DEFAULT_MODEL,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_API_URL,
    },
    streaming: true,
  })

  try {
    const configName = name.split('_')[0]
    const config = await import(
      resolve(process.cwd(), `./src/agent/${configName}`)
    )

    return {
      ...config.default,
      model,
    }
  } catch (error) {
    return {
      model,
    }
  }
}

const invoke: Middleware = async (ctx) => {
  const { workId, prompt, autoRunScope } = ctx.request.body as {
    workId: string
    prompt: string
    autoRunScope?: ShuttleAi.Cluster.AutoRunScope
  }

  // 设置响应头为Server-Sent Events格式
  ctx.type = 'application/octet-stream'
  ctx.set('Cache-Control', 'no-cache')
  ctx.set('Connection', 'keep-alive')
  ctx.status = 200

  const { stream, hooks, send, close, resolveConfirmTool, resolveAgentStart } =
    readableHook(loadAgent)

  const agentCluster = new AgentCluster({
    id: workId,
    hooks: hooks,
    autoRunScope,
    messageCollector: new FileMessageCollector(
      resolve(process.cwd(), './agent/messages'),
    ),
  })

  resolverManager.addAgentResolver(agentCluster.id, {
    resolveConfirmTool,
    resolveAgentStart,
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
