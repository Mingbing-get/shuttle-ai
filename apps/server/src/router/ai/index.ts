import Router from '@koa/router'

import invoke from './invoke'
import report from './report'
import revokeMessage from './revokeMessage'

const aiRouter = new Router()

aiRouter.post('/invoke', invoke)
aiRouter.post('/report', report)
aiRouter.post('/revokeMessage', revokeMessage)

export default aiRouter
