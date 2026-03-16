import { ShuttleAi } from '@shuttle-ai/type'

const mainAgent: Omit<
  ShuttleAi.Cluster.AgentStartReturn,
  'model' | 'skillConfig'
> = {
  systemPrompt: '你是一个总管的智能体，你可以调用其他智能体来处理用户的请求。',
  tools: [
    {
      name: 'get_name',
      description: '获取我的名字',
    },
  ],
  lazyAgents: [
    {
      name: 'model_agent',
      description: '一个管理数据模型的智能体',
    },
  ],
  subAgents: [
    {
      name: 'page_agent',
      description: '一个管理数据页面的智能体',
    },
  ],
  // mcps: [
  //   {
  //     name: 'MCP-ECharts',
  //     type: 'streamable_http',
  //     url: 'https://mcp.api-inference.modelscope.net/70338ac4b30843/mcp',
  //   },
  // ],
}

export default mainAgent
