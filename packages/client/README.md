# @shuttle-ai/client

## 项目概述

`@shuttle-ai/client` 是 Shuttle AI 的客户端操作库，提供了与 Shuttle AI 服务交互的核心功能，包括代理管理、消息处理和工具调用等(仅在浏览器环境运行)。

## 安装

```bash
# 使用 npm
npm install @shuttle-ai/client

# 使用 yarn
yarn add @shuttle-ai/client

# 使用 pnpm
pnpm add @shuttle-ai/client
```

## 核心功能

### 1. Work 类

`Work` 类是客户端的核心，负责管理工作流程，处理与服务器的通信，以及管理代理实例。

**主要功能：**

- 发起 AI 对话（`invoke` 方法）
- 管理代理实例（`addAgent`, `getAgent` 方法）
- 处理工作状态（`status` 属性）
- 控制自动运行范围（`autoRunScope` 属性）
- 停止工作流程（`stop` 方法）

### 2. Agent 类

`Agent` 类表示一个 AI 代理，负责处理消息、工具调用和子代理。

**主要功能：**

- 管理消息历史（`messages` 属性）
- 处理 AI 消息和工具调用
- 管理子代理（`children` 属性）
- 执行工具（`confirmTool` 方法）
- 事件监听（`on` 方法）

### 3. Transporter

Transporter 负责与服务器的网络通信，包括发送请求和接收响应。

**主要实现：**

- HTTP Transporter：基于 axios 的 HTTP 通信实现

## 基本使用

### 创建 Work 实例

```typescript
import { Work, HttpTransporter } from '@shuttle-ai/client'

// 创建 HTTP Transporter 实例
const transporter = new HttpTransporter({
  baseURL: 'https://api.shuttle-ai.com',
  // 其他 axios 配置
})

// 创建 Work 实例
const work = new Work({
  transporter,
  initAgent: (agentName) => {
    // 根据代理名称返回代理配置
    return {
      tools: [
        // 工具配置
      ],
    }
  },
  autoRunScope: 'none', // 可选：'always', 'read', 'none'
})
```

### 发起对话

```typescript
// 发起对话
await work.invoke('你好，我需要帮助')

// 监听工作状态变化
work.on('status', () => {
  console.log('工作状态:', work.status)
})

// 监听代理变化
work.on('agent', () => {
  const rootAgent = work.getRootAgent()
  if (rootAgent) {
    // 监听代理消息
    rootAgent.on('messages', (messages) => {
      console.log('消息更新:', messages)
    })
  }
})
```

### 处理工具调用

```typescript
// 当代理需要工具调用时
rootAgent.on('toolMessage', (toolMessage) => {
  if (!toolMessage.confirm) {
    // 确认工具调用
    rootAgent.confirmTool(toolMessage.id, {
      type: 'confirm',
    })
  }
})
```

## API 文档

### Work 类

#### 构造函数

```typescript
new Work(options: ShuttleAi.Client.Work.Options)
```

**参数：**

- `options.transporter`: Transporter 实例，用于与服务器通信
- `options.initAgent`: 初始化代理的函数或配置对象
- `options.autoRunScope`: 自动运行范围，可选值为 'always', 'read', 'none'

#### 方法

- `invoke(prompt: string)`: 发起对话
- `stop()`: 停止工作流程
- `revoke(workId: string)`: 撤销工作
- `revokeAgent(agentId: string, agentName: string)`: 撤销代理
- `on(type: ListenerType, cb: () => void)`: 监听事件
- `getAgent(id: string)`: 获取代理实例
- `getRootAgent()`: 获取根代理实例
- `setAutoRunScope(scope: ShuttleAi.Client.Work.AutoRunScope)`: 设置自动运行范围

### Agent 类

#### 构造函数

```typescript
new Agent(options: ShuttleAi.Client.Agent.Options)
```

**参数：**

- `options.id`: 代理 ID
- `options.name`: 代理名称
- `options.work`: Work 实例
- `options.status`: 代理状态，可选值为 'idle', 'running', 'waitRevoke'
- `options.history`: 消息历史
- `options.parentId`: 父代理 ID
- `options.tools`: 工具配置

#### 方法

- `addTools(tools?: ShuttleAi.Client.Agent.WithRunTool[])`: 添加工具
- `addChild(agent: Agent, belongMessageId: string)`: 添加子代理
- `run()`: 运行代理
- `end()`: 结束代理
- `addChunk(chunk: ShuttleAi.Message.AIChunk)`: 添加 AI 消息片段
- `addMessage(message: ShuttleAi.Message.Define)`: 添加消息
- `revokeMessages(messages: ShuttleAi.Message.Define[])`: 撤销消息
- `addToolCall(aiTool: ShuttleAi.Message.AITool)`: 添加工具调用
- `endTool(info: ShuttleAi.Ask.ToolEnd['data'])`: 结束工具调用
- `confirmTool(toolId: string, confirmResult: ShuttleAi.Tool.ConfirmResult)`: 确认工具调用
- `revoke()`: 撤销代理
- `on<K extends keyof ShuttleAi.Client.Agent.EventMap>(type: K, cb: (data: ShuttleAi.Client.Agent.EventMap[K]) => void)`: 监听事件

#### 属性

- `children`: 子代理数组
- `messages`: 消息数组
- `status`: 代理状态

## 依赖

- `@shuttle-ai/type`: Shuttle AI 类型定义
- `zod`: 数据验证库
- `axios`: HTTP 客户端

## 许可证

MIT
