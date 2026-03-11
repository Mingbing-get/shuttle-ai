import { ShuttleAi } from '@shuttle-ai/type'
import { NSkillHub } from './type'
import GitHubInstaller from './github'
import ZipInstaller from './zip'

export default class SkillHub {
  private config: NSkillHub.SkillHubConfig

  constructor(config?: NSkillHub.SkillHubConfig) {
    this.config = config || {}
  }

  createInstaller(source: NSkillHub.SkillSource): NSkillHub.SkillInstaller {
    switch (source.type) {
      case 'github':
        return new GitHubInstaller(
          source as NSkillHub.GitHubSource,
          this.config,
        )
      case 'zip':
        return new ZipInstaller(source as NSkillHub.ZipSource)
      default:
        throw new Error(
          `Unsupported skill source type: ${(source as any).type}`,
        )
    }
  }

  async install(
    source: NSkillHub.SkillSource,
    options: NSkillHub.InstallOptions,
  ): Promise<string[]> {
    const installer = this.createInstaller(source)
    return installer.install(options)
  }

  async validate(source: NSkillHub.SkillSource): Promise<boolean> {
    const installer = this.createInstaller(source)
    return installer.validate()
  }

  async getSkillInfo(
    source: NSkillHub.SkillSource,
  ): Promise<ShuttleAi.Skill.Metadata> {
    const installer = this.createInstaller(source)
    return installer.getSkillInfo()
  }

  static parseGitHubUrl(url: string): NSkillHub.GitHubSource {
    const githubRegex =
      /^https?:\/\/(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)(?:\/(.*))?)?$/
    const match = url.match(githubRegex)

    if (!match) {
      throw new Error('Invalid GitHub URL format')
    }

    const [, owner, repo, ref, path] = match
    return {
      type: 'github',
      identifier: `${owner}/${repo}`,
      owner,
      repo,
      ref,
      path,
    }
  }

  static parseUrl(url: string): NSkillHub.SkillSource {
    if (url.includes('github.com')) {
      return this.parseGitHubUrl(url)
    } else {
      throw new Error('Unsupported URL format')
    }
  }
}
