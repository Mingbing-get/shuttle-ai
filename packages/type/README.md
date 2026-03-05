# `@shuttle-ai/type`

`@shuttle-ai/type` 为 Shuttle AI 框架提供完整的 TypeScript 类型定义，涵盖工具定义、消息结构、代理通信等核心概念(nodejs环境和浏览器均可运行)。

## 安装

```bash
npm install @shuttle-ai/type
# 或
yarn add @shuttle-ai/type
# 或
pnpm add @shuttle-ai/type
```

## 命名空间

### `ShuttleAi.Tool`

工具相关类型定义：

- **Scope**: 工具作用域 (`autoRun` | `read` | `write`)
- **Extras**: 工具额外配置
- **Result**: 工具执行结果
- **ConfirmResult**: 工具调用确认结果
- **Call**: 工具调用信息
- **Define**: 工具定义结构

### `ShuttleAi.SubAgent`

子代理类型定义：

- **Define**: 子代理定义结构

### `ShuttleAi.Message`

消息类型定义：

- **User**: 用户消息
- **AI**: AI 响应消息
- **AIChunk**: AI 流式输出片段
- **AITool**: AI 工具调用请求
- **Tool**: 工具执行结果消息

### `ShuttleAi.Ask`

框架向外部请求的类型：

- **Ping**: 心跳检测
- **Chunk**: 流式输出片段
- **AgentStart**: 代理开始
- **AgentEnd**: 代理结束
- **ToolStart**: 工具开始执行
- **ToolEnd**: 工具执行结束
- **StartWork**: 工作开始
- **EndWork**: 工作结束

### `ShuttleAi.Report`

框架向上报的类型：

- **ConfirmTool**: 工具调用确认
- **AgentStart**: 代理启动上报

## 使用示例

```typescript
import { ShuttleAi } from '@shuttle-ai/type'

// 定义一个工具
const toolDefine: ShuttleAi.Tool.Define = {
  name: 'search',
  description: '搜索内容',
  schema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
    },
    required: ['query'],
  },
  extras: {
    scope: 'autoRun',
  },
}

// 创建消息
const aiMessage: ShuttleAi.Message.AI = {
  role: 'assistant',
  id: 'msg_001',
  agentId: 'agent_001',
  workId: 'work_001',
  content: '我将帮你搜索相关内容',
  toolCalls: [
    {
      id: 'call_001',
      name: 'search',
      args: { query: 'TypeScript 类型' },
    },
  ],
}
```

## 依赖

- `zod`: 用于 schema 验证的类型定义
