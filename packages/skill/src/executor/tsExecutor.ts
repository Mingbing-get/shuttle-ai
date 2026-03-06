import vm from 'vm'
import { transpileModule, ScriptTarget, ModuleKind } from 'typescript'

import { NSkillLoader } from '../loader/type'
import JsExecutor from './jsExecutor'

export default class TsExecutor implements NSkillLoader.Executor {
  constructor(private vmContext: vm.Context) {}

  async execute(script: string, args: Record<string, any>): Promise<string> {
    // Compile TypeScript to JavaScript
    const result = transpileModule(script, {
      compilerOptions: {
        target: ScriptTarget.ESNext,
        module: ModuleKind.ESNext,
        strict: false,
      },
    })

    // Get the compiled JavaScript code
    const jsCode = result.outputText

    const jsExecutor = new JsExecutor(this.vmContext)

    return jsExecutor.execute(jsCode, args)
  }
}
