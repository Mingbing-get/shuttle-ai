import { Middleware } from '@koa/router'
import { ShuttleAi } from '@shuttle-ai/type'

import { ResponseModel } from '../../utils/responseModel'
import resolverManager from './resolverManager'

const confirmTool: Middleware = (ctx) => {
  const responseModel = new ResponseModel()
  ctx.body = responseModel.getResult()

  const data = ctx.request.body as any as ShuttleAi.Report.Define

  const resolver = resolverManager.getAgentResolve(data.workId)
  if (!resolver) {
    responseModel.setError(
      ResponseModel.CODE.NOT_FOUND,
      `work id ${data.workId} not found`,
    )
    return
  }

  if (data.type === 'toolConfirm') {
    resolver.resolveConfirmTool(data.data.toolId, data.data.result)
  } else if (data.type === 'toolResult') {
    resolver.resolveRemoteTool(data.data.id, data.data.result)
  } else if (data.type === 'initAgent') {
    resolver.resolveInitAgent(data.data.id, data.data.params)
  } else {
    responseModel.setError(
      ResponseModel.CODE.VALIDATE_ERROR,
      `type ${(data as any).type} not found`,
    )
  }
}

export default confirmTool
