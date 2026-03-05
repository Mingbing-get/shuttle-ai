# `@shuttle-ai/render-react`

Shuttle AI Web 端智能体 React 渲染库，提供完整的智能体对话界面组件和 Hooks(仅在浏览器环境运行)。

## 安装

```bash
npm install @shuttle-ai/render-react
```

## 核心功能

- **智能体工作流渲染** - 完整的对话界面组件，支持用户消息、AI 消息、工具调用等
- **Context Provider** - 提供智能体工作的上下文环境
- **Hooks API** - 灵活的 hooks 用于获取状态和消息
- **Markdown 渲染** - 支持 GFM 的 Markdown 渲染组件
- **工具渲染组件** - 内置工具的渲染组件（如待办事项）

## 组件

### AgentWorkProvider

智能体工作流的 Provider 组件，用于包裹整个应用并提供上下文环境。

```tsx
import { AgentWorkProvider } from '@shuttle-ai/render-react'

function App() {
  return (
    <AgentWorkProvider context={{} as any} agentId="your-agent-id">
      <YourApp />
    </AgentWorkProvider>
  )
}
```

### AgentWorkRender

智能体工作流的主渲染组件，包含完整的对话界面（消息列表 + 输入区域）。

```tsx
import { AgentWorkProvider, AgentWorkRender } from '@shuttle-ai/render-react'

function App() {
  return (
    <AgentWorkProvider context={{} as any} agentId="your-agent-id">
      <div style={{ height: '500px' }}>
        <AgentWorkRender />
      </div>
    </AgentWorkProvider>
  )
}
```

### MarkdownRender

Markdown 渲染组件，支持 GFM (GitHub Flavored Markdown)。

```tsx
import { MarkdownRender } from '@shuttle-ai/render-react'

function MyComponent() {
  const markdown = `
# 标题

- 列表项 1
- 列表项 2

**粗体** 和 *斜体*

[链接](https://example.com)
  `

  return <MarkdownRender>{markdown}</MarkdownRender>
}
```

## Hooks

### useWorkStatus

获取智能体工作状态。

```tsx
import { useWorkStatus, useWork } from '@shuttle-ai/render-react'

function MyComponent() {
  const work = useWork()
  const status = useWorkStatus(work)

  console.log('当前状态:', status)
  // 返回值: 'idle' | 'running' | 'stopped'
}
```

### useRootAgent

获取根 Agent 实例。

```tsx
import { useRootAgent, useWork } from '@shuttle-ai/render-react'

function MyComponent() {
  const work = useWork()
  const rootAgent = useRootAgent(work)

  if (rootAgent) {
    console.log('根 Agent:', rootAgent.name)
  }
}
```

### useAgentMessages

获取指定 Agent 的消息列表。

```tsx
import {
  useAgentMessages,
  useRootAgent,
  useWork,
} from '@shuttle-ai/render-react'

function MessageList() {
  const work = useWork()
  const rootAgent = useRootAgent(work)
  const messages = useAgentMessages(rootAgent!)

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>
          {msg.role}: {msg.content}
        </div>
      ))}
    </div>
  )
}
```

### useAgentStatus

获取 Agent 状态。

```tsx
import { useAgentStatus, useRootAgent, useWork } from '@shuttle-ai/render-react'

function StatusIndicator() {
  const work = useWork()
  const rootAgent = useRootAgent(work)
  const status = useAgentStatus(rootAgent!)

  console.log('Agent 状态:', status)
  // 返回值: 'idle' | 'running' | 'waitRevoke' | 'waitConfirm' | 'waitInput'
}
```

### useWorkAutoRunScope

获取或设置工具自动执行范围。

```tsx
import { useWorkAutoRunScope, useWork } from '@shuttle-ai/render-react'

function AutoRunControl() {
  const work = useWork()
  const scope = useWorkAutoRunScope(work)

  const handleChange = (value: 'always' | 'read' | 'none') => {
    work.setAutoRunScope(value)
  }
}
```

## 完整示例

```tsx
import React from 'react'
import { AgentWorkProvider, AgentWorkRender } from '@shuttle-ai/render-react'

export default function ChatApp() {
  return (
    <AgentWorkProvider context={{} as any} agentId="your-agent-id">
      <div style={{ height: '600px', width: '100%' }}>
        <AgentWorkRender />
      </div>
    </AgentWorkProvider>
  )
}
```

## 导出概览

```tsx
// 组件
export { AgentWorkProvider } from './context'
export { AgentWorkRender } from './agentWork'
export { MarkdownRender } from './markdownRender'

// 渲染组件
export { AiMessageRender } from './agentWork'
export { UserMessageRender } from './agentWork'
export { ToolRender } from './agentWork'
export { ToolConfirmRender } from './agentWork'
export { CatchResultError } from './agentWork'

// Hooks
export { useWork } from './context'
export { useWorkStatus } from './hooks'
export { useWorkAutoRunScope } from './hooks'
export { useRootAgent } from './hooks'
export { useAgentMessages } from './hooks'
export { useAgentStatus } from './hooks'
export { useToolMessage } from './hooks'
export { useAiMessage } from './hooks'

// 工具渲染
export { writeTodosTool } from './tools'
```

## 依赖

- `@shuttle-ai/type`: Shuttle AI 类型定义
- `@shuttle-ai/client`: Shuttle AI 客户端
- `zod`: 数据验证库
