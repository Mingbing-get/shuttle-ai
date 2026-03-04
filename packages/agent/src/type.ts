export * from '@shuttle-ai/type'
import { ClientTool } from '@langchain/core/tools'
import { RunnableConfig } from '@langchain/core/runnables'
import { CreateAgentParams } from 'langchain'
import AgentCluster from './cluster/instance'

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

        messageCollector?: MessageCollector

        /**
         * The messages of the agent.
         */
        messages?: ShuttleAi.Message.Define[]

        single?: AbortSignal

        runnableOptions?: Pick<
          RunnableConfig,
          'configurable' | 'maxConcurrency' | 'recursionLimit' | 'timeout'
        >
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

        /**
         * The lazy tools of the agent.
         */
        lazyTools?: (ShuttleAi.Tool.Define | ClientTool)[]
        /**
         * The lazy sub-agents of the agent.
         */
        lazyAgents?: Omit<ShuttleAi.SubAgent.Define, 'tools' | 'subAgents'>[]
      }

      export interface Hooks {
        onChunk?: (chunk: ShuttleAi.Message.AIChunk) => void
        onAgentStart: (
          options: ShuttleAi.Ask.AgentStart['data'],
        ) => Promise<ToolsWithSubAgents & Omit<CreateAgentParams, 'tools'>>
        onAgentEnd?: (agentId: string) => void
        onToolStart: (
          tool: ShuttleAi.Message.AITool,
        ) => Promise<ShuttleAi.Tool.ConfirmResult>
        onToolEnd?: (toolPath: ShuttleAi.Tool.Path, result: Tool.Result) => void
      }

      export interface MessageCollector {
        saveMessage: (message: ShuttleAi.Message.Define) => void
        getMessagesByAgentId: (
          workId: string,
          agentId: string,
        ) => Promise<ShuttleAi.Message.Define[]>
      }

      export interface SystemContext {
        _agentCluster: AgentCluster
        _agentId: string
        _agentName: string
        _parentAgentId?: string
      }

      export interface Context extends SystemContext {}

      export interface InvokeOptions {
        context?: Context
        [x: string]: any
      }
    }
  }
}
