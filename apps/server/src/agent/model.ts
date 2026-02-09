import { ShuttleAi } from '@shuttle-ai/type'
import { CreateAgentParams } from 'langchain'
import { tool } from '@langchain/core/tools'
import z from 'zod'

const modelAgent: ShuttleAi.Cluster.ToolsWithSubAgents &
  Pick<CreateAgentParams, 'systemPrompt'> = {
  systemPrompt:
    '你是一个数据模型的智能体，你可以查询、创建、更新、删除数据模型。',
  tools: [
    tool(
      () => {
        return ['test', 'user']
      },
      {
        name: 'query_model',
        description: '查询数据模型',
      },
    ),
    tool(
      () => {
        return 'success'
      },
      {
        name: 'create_model',
        description: '创建一个数据模型',
        schema: z.object({
          name: z.string().describe('数据模型的名称'),
        }),
      },
    ),
    tool(
      () => {
        return 'success'
      },
      {
        name: 'update_model',
        description: '更新一个数据模型',
        schema: z.object({
          name: z.string().describe('数据模型的名称'),
        }),
      },
    ),
    tool(
      () => {
        return 'success'
      },
      {
        name: 'delete_model',
        description: '删除一个数据模型',
        schema: z.object({
          name: z.string().describe('数据模型的名称'),
        }),
      },
    ),
  ],
}

export default modelAgent
