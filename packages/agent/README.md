# `@shuttle-ai/agent`

Shuttle AI 智能体操作库，基于 LangChain 构建，提供智能体集群管理、子智能体支持、懒加载工具等功能。(运行于nodejs环境)

## 特性

- **智能体集群管理**：创建和管理多个智能体组成的集群
- **子智能体支持**：通过子智能体扩展核心智能体的能力
- **懒加载工具**：按需加载工具，提高性能
- **消息管理**：内置消息收集和历史记录功能
- **钩子系统**：通过钩子函数自定义智能体行为
- **基于 LangChain**：利用 LangChain 的强大功能

## 安装

```bash
# 使用 npm
npm install @shuttle-ai/agent

# 使用 yarn
yarn add @shuttle-ai/agent

# 使用 pnpm
pnpm add @shuttle-ai/agent
```

## 基本使用

### 创建智能体集群

```typescript
import { AgentCluster } from '@shuttle-ai/agent'

const agentCluster = new AgentCluster({
  id: 'my-agent-cluster',
  hooks: {
    async onAgentStart(options) {
      return {
        tools: [
          {
            name: 'search',
            description: '搜索网络信息',
            schema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: '搜索查询',
                },
              },
              required: ['query'],
            },
          },
        ],
        systemPrompt: '你是一个智能助手，帮助用户回答问题。',
      }
    },
  },
})

// 调用智能体
const result = await agentCluster.invoke('你好，今天天气怎么样？')
console.log(result)
```

## API 文档

### AgentCluster

#### 构造函数

```typescript
new AgentCluster(options: ShuttleAi.Cluster.Options)
```

**参数**：

- `options`：配置选项
  - `id`：可选，智能体集群的唯一标识
  - `autoRunScope`：可选，自动运行范围，默认为 `none`
  - `hooks`：必须，钩子函数
  - `messageCollector`：可选，消息收集器
  - `messages`：可选，初始消息
  - `single`：可选，中止信号
  - `runnableOptions`：可选，LangChain 运行配置

#### 方法

##### `invoke(input: string, options?: Omit<ShuttleAi.Cluster.InvokeOptions, keyof ShuttleAi.Cluster.SystemContext>): Promise<string>`

调用智能体并获取结果。

**参数**：

- `input`：用户输入
- `options`：可选，调用选项

**返回值**：智能体的响应结果

##### `addMessage(message: ShuttleAi.Message.Define): void`

添加消息到智能体集群。

**参数**：

- `message`：消息对象

##### `stop(resign: string = 'stop'): void`

停止智能体执行。

**参数**：

- `resign`：停止原因，默认为 `'stop'`

##### `getMessages(): ShuttleAi.Message.Define[]`

获取所有消息。

**返回值**：消息数组

##### `getLastAiMessage(agentId: string): ShuttleAi.Message.Define | undefined`

获取指定智能体的最后一条 AI 消息。

**参数**：

- `agentId`：智能体 ID

**返回值**：AI 消息对象或 undefined

## 高级功能

### 子智能体

```typescript
const agentCluster = new AgentCluster({
  hooks: {
    async onAgentStart(options) {
      return {
        subAgents: [
          {
            name: 'math_agent',
            description: '处理数学问题',
          },
          {
            name: 'weather_agent',
            description: '查询天气信息',
          },
        ],
        systemPrompt: '你是一个智能助手，帮助用户回答问题。',
      }
    },
  },
})
```

### 懒加载工具

```typescript
const agentCluster = new AgentCluster({
  hooks: {
    async onAgentStart(options) {
      return {
        lazyTools: [
          {
            name: 'database_query',
            description: '查询数据库',
            schema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'SQL 查询语句',
                },
              },
              required: ['query'],
            },
          },
        ],
        systemPrompt: '你是一个智能助手，帮助用户回答问题。',
      }
    },
  },
})
```

## 消息收集器

```typescript
class CustomMessageCollector {
  private messages: ShuttleAi.Message.Define[] = []

  saveMessage(message: ShuttleAi.Message.Define) {
    this.messages.push(message)
  }

  async getMessagesByAgentId(workId: string, agentId: string) {
    return this.messages.filter(
      (msg) => msg.workId === workId && msg.agentId === agentId,
    )
  }
}

const messageCollector = new CustomMessageCollector()

const agentCluster = new AgentCluster({
  messageCollector,
  hooks: {
    // 钩子函数...
  },
})
```

## 依赖

- `@shuttle-ai/type`：Shuttle AI 类型定义
- `langchain`：LangChain 核心库
- `@langchain/core`：LangChain 核心功能
- `@langchain/openai`：OpenAI 集成
- `zod`：类型验证

## 许可证

MIT
