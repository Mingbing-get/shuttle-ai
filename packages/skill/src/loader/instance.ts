import { readdir, readFile } from 'fs/promises'
import { existsSync, statSync } from 'fs'
import { join } from 'path'

import { ShuttleAi } from '@shuttle-ai/type'
import JsonToSkillTransformer from './jsonToSill'
import MdToSkillTransformer from './mdToSkill'
import { NSkillLoader } from './type'
import {
  JsExecutor,
  TsExecutor,
  BashExecutor,
  PythonExecutor,
} from '../executor'

export default class SkillLoader {
  static readonly SkillFileName = 'SKILL'

  private _loadAllExecuted = false
  private skillMap = new Map<string, ShuttleAi.Skill.Define>()
  private toSkillMap = new Map<
    NSkillLoader.SupportedExtensions,
    NSkillLoader.ContentToSkillTransformer
  >([
    ['.json', new JsonToSkillTransformer()],
    ['.md', new MdToSkillTransformer()],
  ])
  private executorMap = new Map<
    NSkillLoader.SupportedScriptExtensions,
    NSkillLoader.Executor
  >([
    ['.js', new JsExecutor()],
    ['.ts', new TsExecutor()],
    ['.sh', new BashExecutor()],
    ['.bash', new BashExecutor()],
    ['.py', new PythonExecutor()],
  ])

  private defaultSupportExtends: NSkillLoader.SupportedExtensions[] = [
    '.md',
    '.json',
  ]
  private defaultSupportScriptExtends: NSkillLoader.SupportedScriptExtensions[] =
    ['.js', '.ts', '.sh', '.bash', '.py']

  constructor(private options: NSkillLoader.Options) {}

  addTransformer(
    ext: NSkillLoader.SupportedExtensions,
    transformer: NSkillLoader.ContentToSkillTransformer,
  ) {
    this.toSkillMap.set(ext, transformer)
  }

  addExecutor(
    ext: NSkillLoader.SupportedScriptExtensions,
    executor: NSkillLoader.Executor,
  ) {
    this.executorMap.set(ext, executor)
  }

  async loadAll(force?: boolean) {
    if (!force && this._loadAllExecuted) return

    if (!existsSync(this.options.dir)) {
      return
    }

    const stat = statSync(this.options.dir)
    if (!stat.isDirectory()) {
      return
    }

    const entries = await readdir(this.options.dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (this.options.pickSkillNames) {
          if (!this.options.pickSkillNames.includes(entry.name)) {
            continue
          }
        }

        if (this.options.omitSkillNames) {
          if (this.options.omitSkillNames.includes(entry.name)) {
            continue
          }
        }

        await this.load(join(this.options.dir, entry.name))
      }
    }

    this._loadAllExecuted = true
  }

  async load(path: string) {
    if (!existsSync(path)) {
      return
    }

    const stat = statSync(path)
    if (!stat.isDirectory()) {
      return
    }

    const entries = await readdir(path, { withFileTypes: true })
    const supportedExtensions = this.options.supportedExtensions?.length
      ? this.options.supportedExtensions
      : this.defaultSupportExtends

    for (const entry of entries) {
      if (!entry.isFile()) continue

      const [fileName, _ext] = entry.name.split('.')
      const ext = `.${_ext}`
      if (fileName !== SkillLoader.SkillFileName) continue

      const transformer = this.toSkillMap.get(
        ext as NSkillLoader.SupportedExtensions,
      )

      if (
        !transformer ||
        !supportedExtensions.includes(ext as NSkillLoader.SupportedExtensions)
      ) {
        continue
      }

      const content = await readFile(join(path, entry.name), 'utf-8')
      const skill = transformer.toSkill(content)
      if (!skill) continue

      this.skillMap.set(skill.metadata.name, { ...skill, path })
      break
    }
  }

  addSkill(skill: ShuttleAi.Skill.Define) {
    this.skillMap.set(skill.metadata.name, skill)
  }

  getAllSkillMeta() {
    return Array.from(this.skillMap.values().map((define) => define.metadata))
  }

  getSkillByName(name: string) {
    return this.skillMap.get(name)
  }

  getSkillByPath(path: string) {
    if (!path.startsWith(this.options.dir)) {
      return
    }

    const skillName = path.slice(this.options.dir.length + 1)

    return this.skillMap.get(skillName)
  }

  async getReference(skillName: string, path: string) {
    const skill = this.getSkillByName(skillName)
    if (!skill) return

    const refContent = skill.references?.[path]
    if (refContent) {
      return refContent
    }

    if (!skill.path) return

    const refPath = join(
      skill.path,
      path.startsWith('/') ? path.slice(1) : path,
    )
    if (!existsSync(refPath) || !statSync(refPath).isFile()) return

    return readFile(refPath, 'utf-8')
  }

  async executeScript(
    skillName: string,
    path: string,
    args: Record<string, any>,
  ) {
    const ext = `.${path.split('.').pop()}`
    const supportedScriptExtensions =
      this.options.supportedScriptExtensions || this.defaultSupportScriptExtends

    if (
      !supportedScriptExtensions.includes(
        ext as NSkillLoader.SupportedScriptExtensions,
      )
    ) {
      throw new Error(`Script extension '${ext}' not supported`)
    }

    const executor = this.executorMap.get(
      ext as NSkillLoader.SupportedScriptExtensions,
    )
    if (!executor) {
      throw new Error('Executor not found')
    }

    const skill = this.getSkillByName(skillName)
    if (!skill?.path) {
      throw new Error('Skill path not found')
    }

    const requiresEnv = skill.metadata?.env?.requires
    if (requiresEnv?.length && !this.options.getEnv) {
      throw new Error('getEnv not provided')
    }

    const env = await this.options.getEnv?.(skillName)

    requiresEnv?.forEach((key) => {
      if (!env?.[key]) {
        throw new Error(`Env '${key}' not found`)
      }
    })

    const scriptRelativePath = path.startsWith('/') ? path.slice(1) : path
    const scriptFullPath = join(skill.path, scriptRelativePath)

    return executor.execute({
      skillDir: skill.path,
      scriptPath: scriptRelativePath,
      scriptFullPath,
      args,
      env,
      runInDocker: this.options.runInDocker,
    })
  }

  async getScript(skillName: string, path: string) {
    const skill = this.getSkillByName(skillName)
    if (!skill) return

    const scriptContent = skill.scripts?.[path]
    if (scriptContent) {
      return scriptContent
    }

    if (!skill.path) return

    const scriptPath = join(
      skill.path,
      path.startsWith('/') ? path.slice(1) : path,
    )
    if (!existsSync(scriptPath) || !statSync(scriptPath).isFile()) return

    return readFile(scriptPath, 'utf-8')
  }
}
