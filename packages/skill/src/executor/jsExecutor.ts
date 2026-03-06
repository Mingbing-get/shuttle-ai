import { NSkillLoader } from '../loader/type'
import vm from 'vm'
import fetch from 'node-fetch'

export default class JsExecutor implements NSkillLoader.Executor {
  constructor(private vmContext: vm.Context) {}

  async execute(script: string, args: Record<string, any>): Promise<string> {
    const output: string[] = []

    const sandbox = {
      fetch,
      ...this.vmContext,
      console: {
        log: (...data: any[]) => {
          output.push(
            data
              .map((d) =>
                typeof d === 'object' ? JSON.stringify(d) : String(d),
              )
              .join(' '),
          )
        },
        error: (...data: any[]) => {
          output.push(
            `ERROR: ${data.map((d) => (typeof d === 'object' ? JSON.stringify(d) : String(d))).join(' ')}`,
          )
        },
        warn: (...data: any[]) => {
          output.push(
            `WARN: ${data.map((d) => (typeof d === 'object' ? JSON.stringify(d) : String(d))).join(' ')}`,
          )
        },
        info: (...data: any[]) => {
          output.push(
            `INFO: ${data.map((d) => (typeof d === 'object' ? JSON.stringify(d) : String(d))).join(' ')}`,
          )
        },
      },
      _args: args,
    }

    try {
      const context = vm.createContext(sandbox)
      const wrappedScript = `(async () => {
        ${script}
      })()`
      const result = await vm.runInContext(wrappedScript, context)
      if (result !== undefined) {
        output.push(String(result))
      }
    } catch (error) {
      output.push(
        `ERROR: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    return output.join('\n')
  }
}
