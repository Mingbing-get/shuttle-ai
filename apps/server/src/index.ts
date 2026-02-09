import Koa from 'koa'
import cors from '@koa/cors'
import koaBody from 'koa-body'
import mount from 'koa-mount'

import errorHandle from './middleware/errorHandle'
import { jwtVerify } from './middleware/jwt'
import aiRouter from './router/ai'

main()

async function main() {
  // 创建Koa应用实例
  const app = new Koa()

  // 配置CORS中间件
  app.use(cors())

  // 配置koa-body中间件
  app.use(koaBody())

  // 配置错误处理中间件
  app.use(errorHandle)

  // 配置JWT验证中间件
  app.use(jwtVerify)

  app.use(mount('/ai', aiRouter.routes()))

  // 错误处理中间件
  app.use(async (ctx, next) => {
    try {
      await next()
    } catch (err: any) {
      ctx.status = err.status || 500
      ctx.body = {
        error: err.message || 'Internal Server Error',
      }
    }
  })

  // 启动服务器
  const PORT = process.env.PORT || 3100
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
  })
}
