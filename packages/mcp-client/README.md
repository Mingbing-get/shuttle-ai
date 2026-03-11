# `@shuttle-ai/mcp-client`

Shuttle AI MCP (Model Context Protocol) 客户端，用于连接和管理 MCP 服务器，支持工具调用和流式传输。

## 功能特性

- 🚀 支持连接多个 MCP 服务器
- 🛠️ 工具列表查询和调用
- 📡 支持 HTTP 流式传输 (streamable_http)
- 🎯 按工具名称自动查找并调用
- 🔌 可扩展的传输层架构
- ⚡ 事件驱动，基于 EventEmitter
- 📝 完整的 TypeScript 类型支持

## 安装

```bash
npm install @shuttle-ai/mcp-client
# 或
yarn add @shuttle-ai/mcp-client
# 或
pnpm add @shuttle-ai/mcp-client
```

## 快速开始

```typescript
import { MCPClient } from '@shuttle-ai/mcp-client'

// 创建客户端实例
const client = new MCPClient({
  servers: [
    {
      name: 'my-server',
      type: 'streamable_http',
      url: 'http://localhost:3000/mcp',
      headers: {
        Authorization: 'Bearer your-token',
      },
    },
  ],
})

// 连接到服务器
await client.connect()

// 列出所有工具
const tools = await client.listAllTools()
console.log('Available tools:', tools)

// 调用工具
const result = await client.callTool('my-server', {
  name: 'tool-name',
  arguments: {
    param1: 'value1',
  },
})
console.log('Tool result:', result)
```

## 配置说明

### ClientConfig

```typescript
interface ClientConfig {
  servers: ServerConfig[] // 服务器配置列表
  timeout?: number // 请求超时时间（可选）
}
```

### ServerConfig

目前支持 `streamable_http` 类型的服务器配置：

```typescript
interface StreamableHttpServerConfig {
  name: string // 服务器名称（唯一标识）
  type: 'streamable_http'
  url: string // 服务器 URL
  headers?: Record<string, string> // 自定义请求头
}
```

## API 文档

### MCPClient

主客户端类，继承自 `EventEmitter`。

#### 构造函数

```typescript
constructor(config: ClientConfig)
```

#### 方法

##### connect()

连接所有配置的服务器。

```typescript
await client.connect(): Promise<void>
```

##### connectServer(serverName)

连接指定名称的服务器。

```typescript
await client.connectServer(serverName: string): Promise<void>
```

##### disconnect()

断开所有服务器连接。

```typescript
await client.disconnect(): Promise<void>
```

##### disconnectServer(serverName)

断开指定服务器的连接。

```typescript
await client.disconnectServer(serverName: string): Promise<void>
```

##### listTools(serverName?)

列出工具。如果不指定 `serverName`，则返回所有服务器的工具。

```typescript
await client.listTools(serverName?: string): Promise<Map<string, Tool[]>>
```

##### listAllTools()

列出所有服务器的所有工具，返回扁平化的数组。

```typescript
await client.listAllTools(): Promise<Array<{ server: string; tool: Tool }>>
```

##### callTool(serverName, request)

调用指定服务器的工具。

```typescript
await client.callTool(
  serverName: string,
  request: ToolCallRequest
): Promise<ToolCallResponse>
```

##### callToolByName(toolName, args?)

按工具名称自动查找并调用工具（在所有连接的服务器中查找）。

```typescript
await client.callToolByName(
  toolName: string,
  args?: Record<string, unknown>
): Promise<ToolCallResponse>
```

##### addServer(serverConfig)

添加服务器配置。

```typescript
client.addServer(serverConfig: ServerConfig): MCPClient
```

##### addTransport(type, creator)

添加自定义传输层。

```typescript
client.addTransport<T extends ServerConfig['type']>(
  type: T,
  creator: (config: Extract<ServerConfig, { type: T }>) => ServerTransport
): void
```

##### getServerTransport(serverName)

获取指定服务器的传输层实例。

```typescript
client.getServerTransport(serverName: string): ServerTransport | undefined
```

##### getConnectedServers()

获取已连接的服务器名称列表。

```typescript
client.getConnectedServers(): string[]
```

##### getConfig()

获取客户端配置。

```typescript
client.getConfig(): ClientConfig
```

### 事件

客户端会触发以下事件：

#### serverError

当服务器发生错误时触发。

```typescript
client.on('serverError', ({ serverName, error }) => {
  console.error(`Server ${serverName} error:`, error)
})
```

## 类型定义

### Tool

```typescript
interface Tool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}
```

### ToolCallRequest

```typescript
interface ToolCallRequest {
  name: string
  arguments?: Record<string, unknown>
}
```

### ToolCallResponse

```typescript
interface ToolCallResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}
```

## 自定义传输层

你可以通过 `addTransport` 方法添加自定义传输层：

```typescript
import { MCPClient } from '@shuttle-ai/mcp-client'
import { EventEmitter } from 'events'
import { ShuttleAi } from '@shuttle-ai/type'

class CustomTransport
  extends EventEmitter
  implements ShuttleAi.MCP.ServerTransport
{
  constructor(config: any) {
    super()
    // 初始化逻辑
  }

  async initialize(): Promise<void> {
    // 初始化连接
  }

  async listTools(): Promise<ShuttleAi.MCP.ListToolsResponse> {
    // 列出工具
  }

  getTools(): Map<string, ShuttleAi.MCP.Tool> {
    // 获取工具
  }

  async callTool(
    request: ShuttleAi.MCP.ToolCallRequest,
  ): Promise<ShuttleAi.MCP.ToolCallResponse> {
    // 调用工具
  }
}

const client = new MCPClient({ servers: [] })

client.addTransport('custom', (config) => new CustomTransport(config))

client.addServer({
  name: 'custom-server',
  type: 'custom',
  // 其他配置
})

await client.connect()
```

## 许可证

MIT
