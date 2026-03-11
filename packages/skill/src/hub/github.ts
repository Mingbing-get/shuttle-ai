import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

import { ShuttleAi } from '@shuttle-ai/type'
import { NSkillHub } from './type'

interface FileInfo {
  name: string
  path: string
  content: string
  type: string
}

export default class GitHubInstaller implements NSkillHub.SkillInstaller {
  private apiUrl: string

  constructor(
    private source: NSkillHub.GitHubSource,
    config?: NSkillHub.SkillHubConfig,
  ) {
    this.apiUrl = config?.githubApiUrl || 'https://api.github.com'
  }

  async install(options: NSkillHub.InstallOptions): Promise<string[]> {
    const { targetDir, force, onProgress } = options

    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true })
    }

    onProgress?.({
      stage: 'downloading',
      message: `Downloading skill from GitHub: ${this.source.owner}/${this.source.repo}`,
    })

    const files = await this.fetchRepositoryContents()
    const skillGroups = this.groupFilesBySkill(files)

    if (skillGroups.size === 0) {
      throw new Error('No skills found in the specified path')
    }

    onProgress?.({
      stage: 'extracting',
      message: `Found ${skillGroups.size} skill(s), extracting files`,
      percentage: 50,
    })

    const installedDirs: string[] = []
    for (const [skillName, skillFiles] of skillGroups.entries()) {
      const skillDir = join(targetDir, skillName)
      if (!force && existsSync(skillDir)) {
        throw new Error(`Skill directory already exists: ${skillDir}`)
      }

      await mkdir(skillDir, { recursive: true })
      for (const file of skillFiles.files) {
        const relativePath = file.path.replace(skillFiles.pathPrefix, '')
        const filePath = join(skillDir, relativePath)
        const dirPath = join(filePath, '..')
        await mkdir(dirPath, { recursive: true })
        await writeFile(filePath, file.content, 'utf-8')
      }
      installedDirs.push(skillDir)
    }

    onProgress?.({
      stage: 'validating',
      message: 'Validating skill structure',
      percentage: 75,
    })

    const isValid = await this.validate()
    if (!isValid) {
      throw new Error('Invalid skill structure')
    }

    onProgress?.({
      stage: 'completed',
      message: `Successfully installed ${installedDirs.length} skill(s)`,
      percentage: 100,
    })

    return installedDirs
  }

  async validate(): Promise<boolean> {
    try {
      const files = await this.fetchRepositoryContents()
      const skillGroups = this.groupFilesBySkill(files)
      return skillGroups.size > 0
    } catch (error) {
      return false
    }
  }

  async getSkillInfo(): Promise<ShuttleAi.Skill.Metadata> {
    const files = await this.fetchRepositoryContents()
    const skillGroups = this.groupFilesBySkill(files)

    if (skillGroups.size === 0) {
      throw new Error('No skills found')
    }

    const firstSkillFiles = Array.from(skillGroups.values())[0]
    const skillFile = firstSkillFiles.files.find(
      (file) => file.name === 'SKILL.md' || file.name === 'SKILL.json',
    )

    if (!skillFile) {
      throw new Error('Skill file not found')
    }

    if (skillFile.name === 'SKILL.json') {
      const skillData = JSON.parse(skillFile.content)
      return skillData.metadata
    } else {
      const matter = await import('gray-matter')
      const { data } = matter.default(skillFile.content)
      return data as ShuttleAi.Skill.Metadata
    }
  }

  private async fetchRepositoryContents(): Promise<
    Array<{ path: string; name: string; content: string; type: string }>
  > {
    const { owner, repo, path: repoPath, ref } = this.source
    const pathSegment = repoPath ? `${repoPath}` : ''
    const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : ''

    const url = `${this.apiUrl}/repos/${owner}/${repo}/contents/${pathSegment}${refParam}`
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (Array.isArray(data)) {
      const files: Array<{
        path: string
        name: string
        content: string
        type: string
      }> = []
      for (const item of data) {
        if (item.type === 'file') {
          const content = await this.fetchFileContent(item.download_url)
          files.push({
            path: item.path,
            name: item.name,
            content,
            type: item.type,
          })
        } else if (item.type === 'dir') {
          const subFiles = await this.fetchDirectoryContents(item.url)
          files.push(...subFiles)
        }
      }
      return files
    } else if (data.type === 'file') {
      const content = await this.fetchFileContent(data.download_url)
      return [
        {
          path: data.path,
          name: data.name,
          content,
          type: data.type,
        },
      ]
    }

    return []
  }

  private async fetchDirectoryContents(
    url: string,
  ): Promise<
    Array<{ path: string; name: string; content: string; type: string }>
  > {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    const data = await response.json()
    const files: Array<{
      path: string
      name: string
      content: string
      type: string
    }> = []

    for (const item of data) {
      if (item.type === 'file') {
        const content = await this.fetchFileContent(item.download_url)
        files.push({
          path: item.path,
          name: item.name,
          content,
          type: item.type,
        })
      } else if (item.type === 'dir') {
        const subFiles = await this.fetchDirectoryContents(item.url)
        files.push(...subFiles)
      }
    }

    return files
  }

  private async fetchFileContent(downloadUrl: string): Promise<string> {
    const response = await fetch(downloadUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`)
    }
    return response.text()
  }

  private groupFilesBySkill(files: Array<FileInfo>) {
    const skillWithPath = this.findSkillNameWithPath(files)
    const skillGroups = new Map<
      string,
      {
        pathPrefix: string
        files: FileInfo[]
      }
    >()

    if (Object.keys(skillWithPath).length === 0) {
      return skillGroups
    }

    for (const file of files) {
      if (file.type !== 'file') {
        continue
      }

      for (const skillName in skillWithPath) {
        const pathPrefix = skillWithPath[skillName]
        if (!file.path.startsWith(pathPrefix)) {
          continue
        }

        if (!skillGroups.has(skillName)) {
          skillGroups.set(skillName, {
            pathPrefix,
            files: [],
          })
        }
        skillGroups.get(skillName)!.files.push(file)
        break
      }
    }

    return skillGroups
  }

  private findSkillNameWithPath(files: FileInfo[]) {
    const skillWithPath: Record<string, string> = {}

    for (const file of files) {
      if (file.type !== 'file') {
        continue
      }

      const pathList = file.path.split('/')
      if (pathList.length === 0) {
        continue
      }

      const fileName = pathList[pathList.length - 1]
      if (!['SKILL.md', 'SKILL.json'].includes(fileName)) {
        continue
      }

      const pathPrefix = pathList.slice(0, -1).join('/')
      const skillName = pathList[pathList.length - 2] || this.source.identifier
      skillWithPath[skillName] = pathPrefix ? `${pathPrefix}/` : ''
    }

    // 判断是否有子路径，有则删除
    const prefixList = Object.values(skillWithPath)
    for (const prefix of prefixList) {
      for (const skillName in skillWithPath) {
        const path = skillWithPath[skillName]
        if (path !== prefix && path.startsWith(prefix)) {
          delete skillWithPath[skillName]
        }
      }
    }

    return skillWithPath
  }
}
