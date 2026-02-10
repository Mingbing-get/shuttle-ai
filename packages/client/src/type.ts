import '@shuttle-ai/type'
import { NHttpTransporter } from './transporter/http/type'
import Work from './work'

declare module '@shuttle-ai/type' {
  export namespace ShuttleAi {
    export namespace Tool {
      export interface Extras {
        disableExport?: boolean
      }
    }

    export namespace Client {
      export namespace Agent {
        export type Status = 'idle' | 'running'

        export interface Options {
          id: string
          work: Work
          status?: Status
          history?: Message.Define[]
          parentId?: string
          tools?: WithRunTool[]
        }

        export interface EventMap {
          status: Status
          messages: Message.Define[]
          subAgents: undefined
          aiMessage: Message.AI
          toolMessage: Message.Tool
        }

        export interface FnTool {
          type: 'fn'
          fn: (args: Record<string, any>) => Promise<any>
        }

        export interface RenderTool {
          type: 'render'
        }

        export interface WithRunTool extends Tool.Define {
          run: FnTool | RenderTool
        }

        export interface WithRunToolParams extends Omit<
          Report.AgentStart['data']['params'],
          'tools'
        > {
          tools?: WithRunTool[]
        }
      }

      export namespace Work {
        export type Status = 'idle' | 'pending' | 'running'

        export type AutoRunScope = 'always' | 'read' | 'none'

        export interface Options {
          transporter: Transporter
          initAgent?:
            | Record<string, Agent.WithRunToolParams>
            | ((agentName: string) => Agent.WithRunToolParams)
          autoRunScope?: AutoRunScope
        }
      }

      export interface StartWork {
        prompt: string
        workId?: string
        autoRunScope?: Work.AutoRunScope
      }

      export interface Transporter {
        invoke: (
          data: StartWork,
        ) => AsyncGenerator<ShuttleAi.Ask.Define, void, unknown>
        report: (data: Report.Define) => Promise<void>
      }

      export interface HttpTransporterOptions extends NHttpTransporter.Options {
        invoke?: Pick<
          NHttpTransporter.MethodConfig<StartWork>,
          'path' | 'beforeSend'
        >
        report?: NHttpTransporter.MethodConfig<Report.Define>
      }
    }
  }
}
