import { ShuttleAi } from '@shuttle-ai/type'

export namespace NSkillHub {
  export interface InstallOptions {
    targetDir: string
    force?: boolean
    onProgress?: (progress: InstallProgress) => void
  }

  export interface InstallProgress {
    stage: 'downloading' | 'extracting' | 'validating' | 'completed'
    message: string
    percentage?: number
  }

  export interface SkillSource {
    type: 'github' | 'zip'
    identifier: string
    version?: string
  }

  export interface GitHubSource extends SkillSource {
    type: 'github'
    identifier: string
    owner: string
    repo: string
    path?: string
    ref?: string
  }

  export interface ZipSource extends SkillSource {
    type: 'zip'
    identifier: string
    zipPath: string
  }

  export interface SkillInstaller {
    install(options: InstallOptions): Promise<string[]>
    validate(): Promise<boolean>
    getSkillInfo(): Promise<ShuttleAi.Skill.Metadata>
  }

  export interface SkillHubConfig {
    githubApiUrl?: string
  }
}
