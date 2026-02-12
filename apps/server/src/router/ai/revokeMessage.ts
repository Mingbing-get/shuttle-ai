import { FileMessageCollector } from '@shuttle-ai/agent'
import { Middleware } from '@koa/router'
import { resolve } from 'path'

import { ResponseModel } from '../../utils/responseModel'

const revokeMessage: Middleware = async (ctx) => {
  const responseModel = new ResponseModel()
  ctx.body = responseModel.getResult()

  const { workId, agentId } = ctx.request.body as any as {
    workId: string
    agentId: string
  }

  const messageCollector = new FileMessageCollector(
    resolve(process.cwd(), './agent/messages'),
  )

  const agentMessages = await messageCollector.getMessagesByAgentId(
    workId,
    agentId,
  )

  const subAgentIds: string[] = []
  agentMessages.forEach((message) => {
    if (message.role === 'assistant') {
      message.subAgents?.forEach((item) => {
        if (!subAgentIds.includes(item.id)) {
          subAgentIds.push(item.id)
        }
      })
    }
  })

  const subAgentMainMessages = await messageCollector.getSubAgentTasks(
    workId,
    subAgentIds,
  )

  responseModel.setData([...agentMessages, ...subAgentMainMessages])
}

export default revokeMessage
