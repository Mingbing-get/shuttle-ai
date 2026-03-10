import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import AdmZip from 'adm-zip'

import { ShuttleAi } from '@shuttle-ai/type'
import { NSkillHub } from './type'

export default class ZipInstaller implements NSkillHub.SkillInstaller {
  constructor(private source: NSkillHub.ZipSource) {}

  async install(options: NSkillHub.InstallOptions): Promise<string> {
    const { targetDir, force, onProgress } = options

    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true })
    }

    onProgress?.({
      stage: 'downloading',
      message: `Reading zip file: ${this.source.zipPath}`,
    })

    const zip = new AdmZip(this.source.zipPath)
    const entries = zip.getEntries()

    if (entries.length === 0) {
      throw new Error('Zip file is empty')
    }

    onProgress?.({
      stage: 'extracting',
      message: `Extracting ${entries.length} file(s) from zip`,
      percentage: 50,
    })

    const skillGroups = this.groupEntriesBySkill(entries)

    if (skillGroups.size === 0) {
      throw new Error('No skills found in zip file')
    }

    const installedDirs: string[] = []
    for (const [skillName, skillEntries] of skillGroups.entries()) {
      const skillDir = join(targetDir, skillName)
      if (!force && existsSync(skillDir)) {
        throw new Error(`Skill directory already exists: ${skillDir}`)
      }

      await mkdir(skillDir, { recursive: true })

      for (const entry of skillEntries.entries) {
        const relativePath = entry.entryName.replace(
          skillEntries.pathPrefix,
          '',
        )

        const filePath = join(skillDir, relativePath)
        const dirPath = join(filePath, '..')
        await mkdir(dirPath, { recursive: true })
        await writeFile(filePath, entry.getData(), 'utf-8')
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

    return installedDirs[0]
  }

  async validate(): Promise<boolean> {
    try {
      const zip = new AdmZip(this.source.zipPath)
      const entries = zip.getEntries()
      const skillGroups = this.groupEntriesBySkill(entries)
      return skillGroups.size > 0
    } catch (error) {
      return false
    }
  }

  async getSkillInfo(): Promise<ShuttleAi.Skill.Metadata> {
    const zip = new AdmZip(this.source.zipPath)
    const entries = zip.getEntries()
    const skillGroups = this.groupEntriesBySkill(entries)

    if (skillGroups.size === 0) {
      throw new Error('No skills found in zip file')
    }

    const firstSkillEntries = Array.from(skillGroups.values())[0]?.entries
    const skillEntry = firstSkillEntries.find(
      (entry) =>
        entry.entryName.endsWith('SKILL.md') ||
        entry.entryName.endsWith('SKILL.json'),
    )

    if (!skillEntry) {
      throw new Error('Skill file not found')
    }

    const content = skillEntry.getData().toString('utf-8')

    if (skillEntry.entryName.endsWith('SKILL.json')) {
      const skillData = JSON.parse(content)
      return skillData.metadata
    } else {
      const matter = await import('gray-matter')
      const { data } = matter.default(content)
      return data as ShuttleAi.Skill.Metadata
    }
  }

  private groupEntriesBySkill(entries: AdmZip.IZipEntry[]) {
    const skillWithPath = this.findSkillNameWithPath(entries)
    const skillGroups = new Map<
      string,
      {
        pathPrefix: string
        entries: AdmZip.IZipEntry[]
      }
    >()

    if (Object.keys(skillWithPath).length === 0) {
      return skillGroups
    }

    for (const entry of entries) {
      if (entry.isDirectory) {
        continue
      }

      for (const skillName in skillWithPath) {
        const pathPrefix = skillWithPath[skillName]
        if (!entry.entryName.startsWith(pathPrefix)) {
          continue
        }

        if (!skillGroups.has(skillName)) {
          skillGroups.set(skillName, {
            pathPrefix,
            entries: [],
          })
        }
        skillGroups.get(skillName)!.entries.push(entry)
        break
      }
    }

    return skillGroups
  }

  private findSkillNameWithPath(entries: AdmZip.IZipEntry[]) {
    const skillWithPath: Record<string, string> = {}

    for (const entry of entries) {
      if (entry.isDirectory) {
        continue
      }

      const pathList = entry.entryName.split('/')
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
