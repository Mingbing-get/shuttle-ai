# `@shuttle-ai/mcp-client`

Shuttle AI MCP (Model Context Protocol) 客户端，用于连接和管理 MCP 服务器，支持工具调用和流式传输。

## 功能特性

- 🚀 支持连接多个 MCP 服务器
- 🛠️ 工具列表查询和调用
- 📡 支持 HTTP 流式传输 (streamable_http)
- 🎯 按服务器名称管理连接
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

// 连接到所有服务器
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
interface ServerConfig {
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

##### addServer(serverConfig)

添加服务器配置到客户端。

```typescript
client.addServer(serverConfig: ServerConfig): MCPClient
```

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

##### getServer(serverName)

获取指定服务器的底层 MCP 客户端实例。

```typescript
client.getServer(serverName: string): Client | undefined
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

## 类型定义

### Tool

```typescript
interface Tool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
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

## 使用示例

### 基本使用

```typescript
import { MCPClient } from '@shuttle-ai/mcp-client'

const client = new MCPClient({
  servers: [
    {
      name: 'weather-server',
      type: 'streamable_http',
      url: 'https://api.example.com/mcp/weather',
    },
  ],
})

await client.connect()

// 列出工具
const tools = await client.listTools('weather-server')
console.log(tools)

// 调用工具
const result = await client.callTool('weather-server', {
  name: 'get_weather',
  arguments: {
    city: 'Beijing',
  },
})

console.log(result.content)
```

### 多服务器管理

```typescript
import { MCPClient } from '@shuttle-ai/mcp-client'

const client = new MCPClient({
  servers: [
    {
      name: 'weather-server',
      type: 'streamable_http',
      url: 'https://api.example.com/mcp/weather',
    },
    {
      name: 'news-server',
      type: 'streamable_http',
      url: 'https://api.example.com/mcp/news',
    },
  ],
})

await client.connect()

// 列出所有服务器的所有工具
const allTools = await client.listAllTools()
allTools.forEach(({ server, tool }) => {
  console.log(`[${server}] ${tool.name}: ${tool.description}`)
})

// 获取已连接的服务器
const connectedServers = client.getConnectedServers()
console.log('Connected servers:', connectedServers)
```

### 动态添加服务器

```typescript
import { MCPClient } from '@shuttle-ai/mcp-client'

const client = new MCPClient({
  servers: [],
})

// 动态添加服务器
client.addServer({
  name: 'dynamic-server',
  type: 'streamable_http',
  url: 'https://api.example.com/mcp/dynamic',
})

await client.connect()
```

### 选择性连接

```typescript
import { MCPClient } from '@shuttle-ai/mcp-client'

const client = new MCPClient({
  servers: [
    {
      name: 'server-1',
      type: 'streamable_http',
      url: 'https://api.example.com/mcp/1',
    },
    {
      name: 'server-2',
      type: 'streamable_http',
      url: 'https://api.example.com/mcp/2',
    },
  ],
})

// 只连接特定服务器
await client.connectServer('server-1')

// 使用后断开连接
await client.disconnectServer('server-1')
```

## 依赖

- `@shuttle-ai/type` - Shuttle AI 类型定义
- `@modelcontextprotocol/sdk` - MCP SDK

## 许可证

MIT
