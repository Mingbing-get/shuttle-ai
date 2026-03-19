import '@shuttle-ai/type'

declare module '@shuttle-ai/type' {
  export namespace ShuttleAi {
    export namespace MCP {
      export interface Tool {
        name: string
        description?: string
        inputSchema?: Record<string, unknown>
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

      export interface ClientConfig {
        servers: ServerConfig[]
        timeout?: number
      }
    }
  }
}
