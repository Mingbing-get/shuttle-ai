import { Middleware } from '@koa/router'
import { ResponseModel } from '../utils/responseModel'

const errorHandle: Middleware = async (ctx, next) => {
  try {
    await next()
  } catch (err: any) {
    const resModel = new ResponseModel(
      ResponseModel.CODE.INTERNAL_SERVER_ERROR,
      err instanceof Error ? err.message || '未知错误' : '未知错误',
    )
    ctx.body = resModel.getResult()
  }
}

export default errorHandle
