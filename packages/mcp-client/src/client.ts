import { EventEmitter } from 'events'
import { ShuttleAi } from '@shuttle-ai/type'
import { HTTPStreamableTransport } from './transports/httpStreamable.js'

export class MCPClient extends EventEmitter {
  private servers: Map<string, ShuttleAi.MCP.ServerTransport> = new Map()
  private config: ShuttleAi.MCP.ClientConfig

  private transportCreator: Record<
    ShuttleAi.MCP.ServerConfig['type'],
    (config: ShuttleAi.MCP.ServerConfig) => ShuttleAi.MCP.ServerTransport
  > = {
    streamable_http: (config) =>
      new HTTPStreamableTransport(
        config as ShuttleAi.MCP.StreamableHttpServerConfig,
      ),
  }

  constructor(config: ShuttleAi.MCP.ClientConfig) {
    super()
    this.config = config
  }

  addTransport<T extends ShuttleAi.MCP.ServerConfig['type']>(
    type: T,
    creator: (
      config: Extract<ShuttleAi.MCP.ServerConfig, { type: T }>,
    ) => ShuttleAi.MCP.ServerTransport,
  ) {
    this.transportCreator[type] = creator as any
  }

  addServer(serverConfig: ShuttleAi.MCP.ServerConfig) {
    this.config.servers.push(serverConfig)

    return this
  }

  async connect(): Promise<void> {
    const connectionPromises = this.config.servers.map(async (serverConfig) => {
      const client = this.transportCreator[serverConfig.type](serverConfig)

      client.on('error', (error: Error) => {
        this.emit('serverError', { serverName: serverConfig.name, error })
      })

      await client.initialize()
      this.servers.set(serverConfig.name, client)
    })

    await Promise.all(connectionPromises)
  }

  async connectServer(serverName: string): Promise<void> {
    const serverConfig = this.config.servers.find((s) => s.name === serverName)

    if (!serverConfig) {
      throw new Error(`Server configuration not found: ${serverName}`)
    }

    if (this.servers.has(serverName)) {
      throw new Error(`Server already connected: ${serverName}`)
    }

    const client = this.transportCreator[serverConfig.type](serverConfig)

    client.on('error', (error: Error) => {
      this.emit('serverError', { serverName, error })
    })

    await client.initialize()
    this.servers.set(serverName, client)
  }

  async disconnect(): Promise<void> {
    this.servers.clear()
  }

  async disconnectServer(serverName: string): Promise<void> {
    this.servers.delete(serverName)
  }

  async listTools(
    serverName?: string,
  ): Promise<Map<string, ShuttleAi.MCP.Tool[]>> {
    const result = new Map<string, ShuttleAi.MCP.Tool[]>()

    if (serverName) {
      const client = this.servers.get(serverName)

      if (!client) {
        throw new Error(`Server not connected: ${serverName}`)
      }

      const response = await client.listTools()
      result.set(serverName, response.tools)
    } else {
      const toolPromises = Array.from(this.servers.entries()).map(
        async ([name, client]) => {
          const response = await client.listTools()
          return [name, response.tools] as [string, ShuttleAi.MCP.Tool[]]
        },
      )

      const tools = await Promise.all(toolPromises)
      tools.forEach(([name, tools]) => {
        result.set(name, tools)
      })
    }

    return result
  }

  async listAllTools(): Promise<
    Array<{ server: string; tool: ShuttleAi.MCP.Tool }>
  > {
    const allTools: Array<{ server: string; tool: ShuttleAi.MCP.Tool }> = []

    const toolsMap = await this.listTools()

    for (const [server, tools] of toolsMap.entries()) {
      for (const tool of tools) {
        allTools.push({ server, tool })
      }
    }

    return allTools
  }

  async callTool(
    serverName: string,
    request: ShuttleAi.MCP.ToolCallRequest,
  ): Promise<ShuttleAi.MCP.ToolCallResponse> {
    const client = this.servers.get(serverName)

    if (!client) {
      throw new Error(`Server not connected: ${serverName}`)
    }

    return await client.callTool(request)
  }

  async callToolByName(
    toolName: string,
    args?: Record<string, unknown>,
  ): Promise<ShuttleAi.MCP.ToolCallResponse> {
    for (const [serverName, client] of this.servers.entries()) {
      const tools = client.getTools()

      if (tools.has(toolName)) {
        return await client.callTool({ name: toolName, arguments: args })
      }
    }

    throw new Error(`Tool not found: ${toolName}`)
  }

  getServerTransport(
    serverName: string,
  ): ShuttleAi.MCP.ServerTransport | undefined {
    return this.servers.get(serverName)
  }

  getConnectedServers(): string[] {
    return Array.from(this.servers.keys())
  }

  getConfig(): ShuttleAi.MCP.ClientConfig {
    return this.config
  }
}
