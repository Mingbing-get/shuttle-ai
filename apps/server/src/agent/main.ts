import { ShuttleAi } from '@shuttle-ai/type'
import { CreateAgentParams } from 'langchain'

const mainAgent: ShuttleAi.Cluster.ToolsWithSubAgents &
  Pick<CreateAgentParams, 'systemPrompt'> = {
  systemPrompt: '你是一个总管的智能体，你可以调用其他智能体来处理用户的请求。',
  tools: [
    {
      name: 'get_name',
      description: '获取我的名字',
    },
  ],
  subAgents: [
    {
      name: 'model_agent',
      description: '一个管理数据模型的智能体',
    },
    {
      name: 'page_agent',
      description: '一个管理数据页面的智能体',
    },
  ],
}

export default mainAgent
