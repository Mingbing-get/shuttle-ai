import Router from '@koa/router'

import invoke from './invoke'
import report from './report'

const aiRouter = new Router()

aiRouter.post('/invoke', invoke)
aiRouter.post('/report', report)

export default aiRouter
