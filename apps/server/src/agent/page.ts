import { ShuttleAi } from '@shuttle-ai/type'
import { CreateAgentParams } from 'langchain'
import { tool } from '@langchain/core/tools'
import z from 'zod'

const pageAgent: ShuttleAi.Cluster.ToolsWithSubAgents &
  Pick<CreateAgentParams, 'systemPrompt'> = {
  systemPrompt:
    '你是一个数据页面的智能体，你可以查询、创建、更新、删除数据页面。',
  tools: [
    tool(
      () => {
        return ['test', 'user']
      },
      {
        name: 'query_page',
        description: '查询数据页面',
      },
    ),
    tool(
      () => {
        return 'success'
      },
      {
        name: 'create_page',
        description: '创建一个数据页面',
        schema: z.object({
          name: z.string().describe('数据页面的名称'),
        }),
      },
    ),
    tool(
      () => {
        return 'success'
      },
      {
        name: 'update_page',
        description: '更新一个数据页面',
        schema: z.object({
          name: z.string().describe('数据页面的名称'),
        }),
      },
    ),
    tool(
      () => {
        return 'success'
      },
      {
        name: 'delete_page',
        description: '删除一个数据页面',
        schema: z.object({
          name: z.string().describe('数据页面的名称'),
        }),
      },
    ),
  ],
}

export default pageAgent
