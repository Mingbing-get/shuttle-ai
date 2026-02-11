import { ZodAny } from 'zod'
import { JSONSchema } from 'zod/v4/core/json-schema'

export namespace ShuttleAi {
  export namespace Tool {
    export type Scope = 'autoRun' | 'read' | 'write'

    export interface Extras {
      scope?: Scope
      /**
       * 是否跳过上报,设置为true时将不会向外抛出该工具是否被调用
       */
      skipReport?: boolean
      remote?: boolean
    }

    export interface ConfirmResult {
      type: 'confirm' | 'reject' | 'confirmWithResult'
      reason?: string
      result?: any
      /**
       * 仅confirm时生效，可修改调用参数
       */
      newArgs?: Record<string, any>
    }

    export interface Call {
      id: string
      name: string
      args: Record<string, any>
    }

    export interface Define {
      name: string
      description: string
      schema?: ZodAny | JSONSchema
      extras?: Extras
    }

    export interface Path {
      agentId: string
      messageId: string
      toolId: string
    }
  }

  export namespace SubAgent {
    export interface Define {
      name: string
      description: string
      remote?: boolean

      tools?: Tool.Define[]
      subAgents?: Define[]
    }
  }

  export namespace Message {
    export interface Base<R extends string> {
      role: R
      id: string
      agentId: string
      workId: string
      parentAgentId?: string
    }

    export interface AIChunk extends Base<'assistant_chunk'> {
      content: string
    }

    export interface AITool extends Base<'assistant_tool'> {
      toolCall: Tool.Call
      needConfirm: boolean
    }

    export interface User extends Base<'user'> {
      content: string
    }

    export interface AI extends Base<'assistant'> {
      content: string
      toolCalls?: Tool.Call[]
      subAgentIds?: string[]
    }

    export interface Tool extends Base<'tool'> {
      aiMessageId: string
      name: string
      content?: string
      confirm?: Tool.ConfirmResult
    }

    export type Define = User | AI | Tool
  }

  export namespace Ask {
    export interface Base<T extends string, D> {
      type: T
      data: D
    }

    export interface Ping extends Base<'ping', undefined> {}

    export interface Chunk extends Base<'chunk', { chunk: Message.AIChunk }> {}

    export interface AgentStart extends Base<
      'agentStart',
      {
        agentId: string
        agentName: string
        beloneMessageId?: string
        parentAgentId?: string
        content: string
      }
    > {}

    export interface AgentEnd extends Base<'agentEnd', { agentId: string }> {}

    export interface ToolStart extends Base<
      'toolStart',
      { tool: Message.AITool }
    > {}

    export interface ToolEnd extends Base<
      'toolEnd',
      { toolPath: Tool.Path; toolResult: any }
    > {}

    export interface StartWork extends Base<'startWork', { workId: string }> {}

    export interface EndWork extends Base<'endWork', { workId: string }> {}

    export type Define =
      | StartWork
      | EndWork
      | Ping
      | Chunk
      | AgentStart
      | AgentEnd
      | ToolStart
      | ToolEnd
  }

  export namespace Report {
    export interface Base<T extends string, D> {
      type: T
      workId: string
      data: D
    }

    export interface ConfirmTool extends Base<
      'toolConfirm',
      { toolId: string; result: ShuttleAi.Tool.ConfirmResult }
    > {}

    export interface AgentStart extends Base<
      'agentStart',
      {
        agentId: string
        params: {
          systemPrompt?: string
          tools?: Tool.Define[]
          subAgents?: SubAgent.Define[]
        }
      }
    > {}

    export type Define = ConfirmTool | AgentStart
  }
}
