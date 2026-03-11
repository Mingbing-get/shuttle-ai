# @shuttle-ai/skill

Shuttle AI 技能操作库，提供技能的加载、执行和安装功能。

## 功能特性

- **技能加载器 (SkillLoader)**: 从本地目录加载和管理技能定义
  - 支持 Markdown (.md) 和 JSON (.json) 格式的技能文件
  - 自动发现和解析技能定义
  - 支持技能元数据查询和检索

- **脚本执行器 (Executor)**: 在 Docker 容器中安全执行脚本
  - Bash 执行器 - 执行 shell 脚本
  - JavaScript 执行器 - 执行 Node.js 脚本
  - TypeScript 执行器 - 执行 TypeScript 脚本
  - Python 执行器 - 执行 Python 脚本

- **技能中心 (SkillHub)**: 从远程源安装和管理技能
  - GitHub 安装器 - 从 GitHub 仓库安装技能
  - ZIP 安装器 - 从 ZIP 压缩包安装技能
  - 支持技能验证和信息获取

- **灵活的扩展机制**
  - 可自定义内容转换器 (ContentToSkillTransformer)
  - 可自定义脚本执行器 (Executor)
  - 支持多种文件格式和脚本语言

## 安装

```bash
npm install @shuttle-ai/skill
```

## 使用示例

### 技能加载器

```typescript
import { SkillLoader } from '@shuttle-ai/skill'

const loader = new SkillLoader({
  dir: './skills',
})

// 加载所有技能
await loader.loadAll()

// 获取所有技能元数据
const skills = loader.getAllSkillMeta()
console.log(skills)

// 根据名称获取技能
const skill = loader.getSkillByName('my-skill')

// 获取技能引用文件
const reference = await loader.getReference('my-skill', '/path/to/reference.md')

// 执行技能脚本
const result = await loader.executeScript('my-skill', '/scripts/main.js', {
  arg1: 'value1',
  arg2: 'value2',
})
```

### 技能中心

```typescript
import { SkillHub } from '@shuttle-ai/skill'

const hub = new SkillHub()

// 从 GitHub 安装技能
const githubSource = {
  type: 'github' as const,
  identifier: 'owner/repo',
  owner: 'owner',
  repo: 'repo',
  ref: 'main',
  path: 'skills/my-skill',
}

await hub.install(githubSource, {
  targetDir: './installed-skills',
  onProgress: (progress) => {
    console.log(`${progress.stage}: ${progress.message}`)
  },
})

// 从 ZIP 文件安装技能
const zipSource = {
  type: 'zip' as const,
  identifier: 'my-zip-skill',
  zipPath: './skills/my-skill.zip',
}

await hub.install(zipSource, {
  targetDir: './installed-skills',
})

// 解析 GitHub URL
const source = SkillHub.parseGitHubUrl(
  'https://github.com/owner/repo/tree/main/skills/my-skill',
)
```

### 自定义扩展

```typescript
import {
  SkillLoader,
  JsonToSkillTransformer,
  BashExecutor,
} from '@shuttle-ai/skill'

const loader = new SkillLoader({
  dir: './skills',
  supportedExtensions: ['.md', '.json'],
  supportedScriptExtensions: ['.js', '.ts', '.sh', '.py'],
})

// 添加自定义转换器
class YamlToSkillTransformer implements ContentToSkillTransformer {
  toSkill(content: string) {
    // 解析 YAML 内容
    const parsed = yaml.parse(content)
    return {
      metadata: parsed.metadata,
      instruction: parsed.instruction,
    }
  }
}

loader.addTransformer('.yaml', new YamlToSkillTransformer())

// 添加自定义执行器
class RubyExecutor implements Executor {
  async execute(options: ScriptExecuteOptions): Promise<string> {
    // 执行 Ruby 脚本
    return `Executed ${options.scriptPath}`
  }
}

loader.addExecutor('.rb', new RubyExecutor())
```

## API 文档

### SkillLoader

#### 构造函数

```typescript
constructor(options: NSkillLoader.Options)
```

#### 方法

- `loadAll(force?: boolean): Promise<void>` - 加载目录下所有技能
- `load(path: string): Promise<void>` - 加载指定路径的技能
- `addSkill(skill: ShuttleAi.Skill.Define): void` - 手动添加技能
- `getAllSkillMeta(): ShuttleAi.Skill.Metadata[]` - 获取所有技能元数据
- `getSkillByName(name: string): ShuttleAi.Skill.Define | undefined` - 根据名称获取技能
- `getSkillByPath(path: string): ShuttleAi.Skill.Define | undefined` - 根据路径获取技能
- `getReference(skillName: string, path: string): Promise<string | undefined>` - 获取技能引用文件
- `executeScript(skillName: string, path: string, args: Record<string, any>): Promise<string>` - 执行技能脚本
- `getScript(skillName: string, path: string): Promise<string | undefined>` - 获取技能脚本内容

### SkillHub

#### 构造函数

```typescript
constructor(config?: NSkillHub.SkillHubConfig)
```

#### 方法

- `install(source: NSkillHub.SkillSource, options: NSkillHub.InstallOptions): Promise<string>` - 安装技能
- `validate(source: NSkillHub.SkillSource): Promise<boolean>` - 验证技能
- `getSkillInfo(source: NSkillHub.SkillSource): Promise<ShuttleAi.Skill.Metadata>` - 获取技能信息
- `static parseGitHubUrl(url: string): NSkillHub.GitHubSource` - 解析 GitHub URL
- `static parseUrl(url: string): NSkillHub.SkillSource` - 解析 URL

### Executor

所有执行器都实现 `NSkillLoader.Executor` 接口：

```typescript
interface Executor {
  execute(options: ScriptExecuteOptions): Promise<string>
}
```

支持的执行器：

- `BashExecutor` - 执行 Bash 脚本
- `JsExecutor` - 执行 JavaScript 脚本
- `TsExecutor` - 执行 TypeScript 脚本
- `PythonExecutor` - 执行 Python 脚本

## 技能文件格式

### Markdown 格式

```markdown
---
name: my-skill
description: A sample skill
version: 1.0.0
author: Your Name
tags:
  - utility
  - automation
---

这是技能的指令内容，描述如何使用这个技能。
```

### JSON 格式

```json
{
  "metadata": {
    "name": "my-skill",
    "description": "A sample skill",
    "version": "1.0.0",
    "author": "Your Name",
    "tags": ["utility", "automation"]
  },
  "instruction": "这是技能的指令内容，描述如何使用这个技能。"
}
```

## 依赖项

- `@shuttle-ai/type` - Shuttle AI 类型定义
- `dockerode` - Docker API 客户端
- `adm-zip` - ZIP 文件处理
- `gray-matter` - Markdown frontmatter 解析

## 许可证

MIT
