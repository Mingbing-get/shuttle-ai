import 'dotenv/config'
import { CreateAgentParams } from 'langchain'
import { ChatOpenAI } from '@langchain/openai'
import { Middleware } from '@koa/router'
import { ShuttleAi } from '@shuttle-ai/type'
import { createUseMemoryTools, OrganizeMemory } from '@shuttle-ai/memory'
import {
  AgentCluster,
  StreamReadableHook,
  FileMessageCollector,
} from '@shuttle-ai/agent'
import { resolve } from 'path'
import { existsSync } from 'fs'

import resolverManager from './resolverManager'

async function loadAgent(name: string): Promise<
  ShuttleAi.Cluster.ToolsWithSubAgents &
    Omit<CreateAgentParams, 'tools'> & {
      skillConfig?: ShuttleAi.Cluster.SkillConfig
    }
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
    const configName = name.split('_').slice(0, -1).join('_')
    const config = await import(
      resolve(process.cwd(), `./src/agent/${configName}/extends`)
    )

    const skillDir = resolve(process.cwd(), `./src/agent/${configName}/skills`)
    const memoryTools = createUseMemoryTools({
      dir: resolve(process.cwd(), './agent/memory'),
    })
    return {
      ...config.default,
      tools: [...(config.default.tools || []), ...memoryTools],
      systemPrompt: [
        config.default.systemPrompt || '',
        `你拥有长期的**记忆系统**，在需要回忆之前的对话内容或借鉴以前的经验时，可以使用${memoryTools.map((tool) => tool.name).join('、')}等方法`,
      ].join('\n'),
      model,
      skillConfig: existsSync(skillDir) ? { dir: skillDir } : undefined,
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

  const streamReadableHook = new StreamReadableHook({
    getAgentParamsFromServer: loadAgent,
  })

  const agentCluster = new AgentCluster({
    id: workId,
    hooks: streamReadableHook.hooks,
    autoRunScope,
    messageCollector: new FileMessageCollector(
      resolve(process.cwd(), './agent/messages'),
    ),
  })

  resolverManager.addAgentResolver(agentCluster.id, {
    resolveConfirmTool: (id, value) =>
      streamReadableHook.resolveConfirmTool(id, value),
    resolveAgentStart: (id, value) =>
      streamReadableHook.resolveAgentStart(id, value),
  })

  function closeAll() {
    streamReadableHook.send({
      type: 'endWork',
      data: { workId: agentCluster.id },
    })
    streamReadableHook.close()
    agentCluster.stop()
    resolverManager.removeAgentResolver(agentCluster.id)

    const organizeMemory = new OrganizeMemory({
      dir: resolve(process.cwd(), './agent/memory'),
      model: new ChatOpenAI({
        modelName: process.env.OPENAI_DEFAULT_MODEL,
        apiKey: process.env.OPENAI_API_KEY,
        configuration: {
          baseURL: process.env.OPENAI_API_URL,
        },
      }),
    })
    organizeMemory.start(agentCluster.getMessages())
  }

  // ctx.req.on('close', closeAll)

  // 由于是流式响应，不返回常规的响应体
  ctx.body = streamReadableHook.createStream()

  streamReadableHook.send({
    type: 'startWork',
    data: { workId: agentCluster.id },
  })
  agentCluster.invoke(prompt).then(closeAll)
}

export default invoke
