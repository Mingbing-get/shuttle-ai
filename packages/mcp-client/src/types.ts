import { EventEmitter } from 'events'
import '@shuttle-ai/type'

declare module '@shuttle-ai/type' {
  export namespace ShuttleAi {
    export namespace MCP {
      export interface Tool {
        name: string
        description: string
        inputSchema: Record<string, unknown>
      }

      export interface ToolCallRequest {
        name: string
        arguments?: Record<string, unknown>
      }

      export interface ToolCallResponse {
        content: Array<{
          type: 'text' | 'image' | 'resource'
          text?: string
          data?: string
          mimeType?: string
        }>
        isError?: boolean
      }

      export interface Message {
        jsonrpc: '2.0'
        id?: string | number
        method?: string
        params?: Record<string, unknown>
        result?: unknown
        error?: {
          code: number
          message: string
          data?: unknown
        }
      }

      export interface ClientConfig {
        servers: ServerConfig[]
        timeout?: number
      }

      export interface ServerConnection<T extends ServerConfig> {
        config: T
        tools: Map<string, Tool>
        process?: any
        requestId: number
      }

      export interface ListToolsResponse {
        tools: Tool[]
      }

      export interface InitializeParams {
        protocolVersion: string
        capabilities: Record<string, unknown>
        clientInfo: {
          name: string
          version: string
        }
      }

      export interface InitializedNotification {
        jsonrpc: '2.0'
        method: 'notifications/initialized'
      }

      export interface ServerTransport extends EventEmitter {
        initialize(): Promise<void>
        listTools(): Promise<ListToolsResponse>
        getTools(): Map<string, Tool>
        callTool(request: ToolCallRequest): Promise<ToolCallResponse>
      }
    }
  }
}
