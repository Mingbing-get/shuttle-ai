import '@shuttle-ai/type'
import { NHttpTransporter } from './transporter/http/type'

declare module '@shuttle-ai/type' {
  export namespace ShuttleAi {
    export namespace Client {
      export namespace Work {
        export type Status = 'idle' | 'pending' | 'running' | 'completed'

        export interface Options {
          transporter: Transporter
          initAgent?:
            | Record<string, Report.InitAgent['data']['params']>
            | ((agentName: string) => Report.InitAgent['data']['params'])
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
