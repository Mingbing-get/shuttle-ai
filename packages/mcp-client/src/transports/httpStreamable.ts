import { EventEmitter } from 'events'
import { ShuttleAi } from '@shuttle-ai/type'
import request from '../request'

export class HTTPStreamableTransport
  extends EventEmitter
  implements ShuttleAi.MCP.ServerTransport
{
  private sessionId?: string
  private connection: ShuttleAi.MCP.ServerConnection<ShuttleAi.MCP.StreamableHttpServerConfig>

  constructor(config: ShuttleAi.MCP.StreamableHttpServerConfig) {
    super()
    if (config.type !== 'streamable_http') {
      throw new Error('Invalid transport type')
    }
    this.connection = {
      config,
      tools: new Map(),
      requestId: 0,
    }
  }

  async initialize() {
    const initParams: ShuttleAi.MCP.InitializeParams = {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: {
          listChanged: true,
        },
        sampling: {},
      },
      clientInfo: {
        name: '@shuttle-ai/mcp-client',
        version: '0.0.11',
      },
    }

    const { header } = await this.sendRequest('initialize', initParams)
    this.sessionId = header['mcp-session-id'] as string

    this.sendNotification('notifications/initialized')
  }

  async listTools(): Promise<ShuttleAi.MCP.ListToolsResponse> {
    const res = await this.sendRequest('tools/list')
    const jsonRes = JSON.parse(res.data)
    const response = jsonRes.result as ShuttleAi.MCP.ListToolsResponse

    for (const tool of response.tools) {
      this.connection.tools.set(tool.name, tool)
    }

    return response
  }

  getTools(): Map<string, ShuttleAi.MCP.Tool> {
    return this.connection.tools
  }

  async callTool(
    request: ShuttleAi.MCP.ToolCallRequest,
  ): Promise<ShuttleAi.MCP.ToolCallResponse> {
    const result = await this.sendRequest('tools/call', request)

    return JSON.parse(result.data).result
  }

  private async sendRequest(method: string, params?: Record<string, any>) {
    const id = ++this.connection.requestId
    const message: ShuttleAi.MCP.Message = {
      jsonrpc: '2.0',
      id,
      method,
      params: params as Record<string, unknown> | undefined,
    }

    return await this.sendMessage(message)
  }

  private sendNotification(method: string, params?: Record<string, any>): void {
    const message: ShuttleAi.MCP.Message = {
      jsonrpc: '2.0',
      method,
      params: params as Record<string, unknown> | undefined,
    }

    this.sendMessage(message)
  }

  private async sendMessage(message: ShuttleAi.MCP.Message) {
    return await request({
      url: this.connection.config.url,
      data: message,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': this.sessionId || '',
        Accept: 'application/json, text/event-stream',
        ...(this.connection.config.headers || {}),
      },
    })
  }
}
