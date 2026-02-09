import '@shuttle-ai/type'
import { ClientTool } from '@langchain/core/tools'
import { CreateAgentParams } from 'langchain'

declare module '@shuttle-ai/type' {
  export namespace ShuttleAi {
    export namespace Cluster {
      export type AutoRunScope = 'always' | 'read' | 'none'

      export interface Options {
        /**
         * The id of the agent cluster.
         */
        id?: string

        /**
         * The scope of auto run.
         * - `always`: Always run the agent.
         * - `read`: Run the agent when the user asks a question.
         * - `none`: Never run the agent.
         * Default: `none`
         */
        autoRunScope?: AutoRunScope

        /**
         * The hooks of the agent.
         */
        hooks: Hooks

        /**
         * The messages of the agent.
         */
        messages?: ShuttleAi.Message.Define[]

        single?: AbortSignal
      }

      export interface ToolsWithSubAgents {
        /**
         * The tools of the agent.
         */
        tools?: (ShuttleAi.Tool.Define | ClientTool)[]
        /**
         * The sub-agents of the agent.
         */
        subAgents?: ShuttleAi.SubAgent.Define[]
      }

      export interface Hooks {
        getAgentParams: (
          name: string,
        ) => Promise<ToolsWithSubAgents & Omit<CreateAgentParams, 'tools'>>
        onChunk?: (chunk: ShuttleAi.Message.AIChunk) => void
        onSubAgentStart?: (
          agentId: string,
          parentAgentId: string,
          content: string,
        ) => void
        onSubAgentEnd?: (agentId: string) => void
        onToolStart?: (tool: ShuttleAi.Message.AITool) => void
        onToolConfirm?: (
          toolPath: ShuttleAi.Tool.Path,
        ) => Promise<ShuttleAi.Tool.ConfirmResult>
        onRunRemoteTool?: (
          toolName: string,
          args?: Record<string, any>,
        ) => Promise<any>
        onToolEnd?: (toolPath: ShuttleAi.Tool.Path, result: any) => void
      }
    }
  }
}
