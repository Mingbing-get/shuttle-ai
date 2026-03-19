import { EventEmitter } from 'events'
import { ShuttleAi } from '@shuttle-ai/type'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp'
import { Client } from '@modelcontextprotocol/sdk/client/index'

export class MCPClient extends EventEmitter {
  private servers: Map<string, Client> = new Map()
  private config: ShuttleAi.MCP.ClientConfig

  constructor(config: ShuttleAi.MCP.ClientConfig) {
    super()
    this.config = config
  }

  addServer(serverConfig: ShuttleAi.MCP.ServerConfig) {
    this.config.servers.push(serverConfig)

    return this
  }

  async connect(): Promise<void> {
    const connectionPromises = this.config.servers.map(async (serverConfig) => {
      const client = await this.newClient(serverConfig)

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

    const client = await this.newClient(serverConfig)

    this.servers.set(serverName, client)
  }

  async disconnect(): Promise<void> {
    this.servers.forEach((client) => {
      client.close()
    })
    this.servers.clear()
  }

  async disconnectServer(serverName: string): Promise<void> {
    this.servers.get(serverName)?.close()
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

    return (await client.callTool(request)) as any
  }

  getServer(serverName: string): Client | undefined {
    return this.servers.get(serverName)
  }

  getConnectedServers(): string[] {
    return Array.from(this.servers.keys())
  }

  getConfig(): ShuttleAi.MCP.ClientConfig {
    return this.config
  }

  private async newClient(serverConfig: ShuttleAi.MCP.ServerConfig) {
    const client = new Client({
      name: '@shuttle-ai/mcp-client',
      version: '0.1.15',
    })

    if (serverConfig.type === 'streamable_http') {
      await client.connect(
        new StreamableHTTPClientTransport(new URL(serverConfig.url), {
          requestInit: {
            headers: serverConfig.headers,
          },
        }),
      )
    }

    return client
  }
}
