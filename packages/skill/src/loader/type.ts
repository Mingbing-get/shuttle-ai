import { ShuttleAi } from '@shuttle-ai/type'

export namespace NSkillLoader {
  export type SupportedExtensions = '.md' | '.json'
  export type SupportedScriptExtensions = '.js' | '.ts' | '.sh' | '.bash'

  export interface Options {
    dir: string
    supportedExtensions?: SupportedExtensions[]
    supportedScriptExtensions?: SupportedScriptExtensions[]
  }

  export interface ContentToSkillTransformer {
    toSkill(
      content: string,
    ): Pick<ShuttleAi.Skill.Define, 'metadata' | 'instruction'> | undefined
  }

  export interface Executor {
    execute(script: string, args: Record<string, any>): Promise<string>
  }
}
