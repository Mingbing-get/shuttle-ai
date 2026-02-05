import { Middleware } from '@koa/router'

export const jwtVerify: Middleware = async (ctx, next) => {
  ctx.state.user = {
    _id: '1',
  }
  await next()
}
