import '@shuttle-ai/type'
import { NHttpTransporter } from './transporter/http/type'
import Work from './work'

declare module '@shuttle-ai/type' {
  export namespace ShuttleAi {
    export namespace Client {
      export namespace Agent {
        export interface Options {
          id: string
          work: Work
          parentId?: string
          tools?: WithRunTool[]
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
        export type Status = 'idle' | 'pending' | 'running' | 'completed'

        export interface Options {
          transporter: Transporter
          initAgent?:
            | Record<string, Agent.WithRunToolParams>
            | ((agentName: string) => Agent.WithRunToolParams)
        }
      }

      export interface StartWork {
        prompt: string
        workId?: string
      }

      export interface Transporter {
        invoke: (data: StartWork) => Promise<void>
        report: (data: Report.Define) => Promise<void>
        on: (cb: (data: Ask.Define) => void) => () => void
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
