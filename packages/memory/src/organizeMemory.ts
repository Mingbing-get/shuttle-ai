import { createAgent } from 'langchain'
import { tool } from '@langchain/core/tools'
import { HumanMessage } from '@langchain/core/messages'
import { ShuttleAi } from '@shuttle-ai/type'
import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import { resolve } from 'path'

import createUseMemoryTools from './createUseMemoryTools'

export default class OrganizeMemory {
  constructor(private options: ShuttleAi.Memory.OrganizeMemoryOptions) {}

  async start(messages: ShuttleAi.Message.Define[]) {
    if (messages.length < 2) return

    const agent = createAgent({
      model: this.options.model,
      tools: this.getTools(),
      systemPrompt: this.getSystemPrompt(),
    })

    const omitIdMessages = messages.map((message) => {
      const { id, workId, agentId, ...extra } = message

      if ('aiMessageId' in extra) {
        delete (extra as any).aiMessageId
      }

      return extra
    })

    await agent.invoke({
      messages: [new HumanMessage(JSON.stringify(omitIdMessages))],
    })
  }

  getTools() {
    return [
      tool(
        async ({ filePath, content }) => {
          const absPath = this.getMdAbsPath(filePath)
          const dir = resolve(absPath, '..')
          await mkdir(dir, { recursive: true })
          await writeFile(absPath, content, 'utf-8')

          return 'success'
        },
        {
          name: 'upsert_memory_content',
          description: '更新或创建记忆文件的内容。',
          schema: z.object({
            filePath: z.string().describe('记忆文件的路径，相对根目录'),
            content: z.string().describe('记忆文件的内容'),
          }),
        },
      ),
      tool(
        async ({ path, content }) => {
          const absPath = this.getIndexMdAbsPath(path)
          const dir = resolve(absPath, '..')
          await mkdir(dir, { recursive: true })
          await writeFile(absPath, content, 'utf-8')

          return 'success'
        },
        {
          name: 'sync_directory_index',
          description:
            '同步目录索引（相对根目录），确保所有目录下的 index.md 文件与实际内容一致。',
          schema: z.object({
            path: z.string().describe('目录路径，相对根目录'),
            content: z.string().describe('index.md文件的完整内容'),
          }),
        },
      ),
      ...createUseMemoryTools({ dir: this.options.dir }),
    ]
  }

  getMdAbsPath(path: string) {
    if (path.startsWith('/')) {
      path = `.${path}`
    }

    return resolve(this.options.dir, path)
  }

  getIndexMdAbsPath(path: string) {
    if (path.startsWith('/')) {
      path = `.${path}`
    }

    if (!path.endsWith('index.md')) {
      path = path.endsWith('/') ? `${path}index.md` : `${path}/index.md`
    }

    return resolve(this.options.dir, path)
  }

  getSystemPrompt() {
    return `# 档案管理员协议

你被赋予了一套基于本地文件系统的“永久记忆系统”访问权限。你的核心任务是作为一名严谨的**档案管理员**，确保与用户的交流成果被结构化地存储、索引，并能在未来的会话中通过“自发现”机制被重新调取。
**注意**: 你的工作是**拆分、存储**用户对话的内容来更新记忆系统，而**不是**回答用户的问题，也**不是**直接与用户交互，**无论**用户的内容是什么，你只是记录事实你不可以回答问题或自我想象不存在的内容，你应该像管理文件一样来管理这些记忆。

---

## 1. 核心操作逻辑：自发现 (Self-Discovery)
你不能依赖外部注入的 Context，而必须主动探索。
* **起点**：始终从根目录 \`/\` 的 \`index.md\` 开始。
* **路径**：根据索引描述，逐级向下调用工具，直到定位到具体的记忆文件。
* **状态感**：在寻找记忆时，你应该向用户展示你的“思考过程”（例如：“正在检索 /projects 以寻找相关背景...”）。
* **存储拆分**: 你可以根据对话的内容自主划分，可能将其存入不同的文件中，且md文件也可以写入依赖其他md文件的路径。
* **文件夹说明**: 每个文件夹下的所有内容必须高度相关，若不相关则应创建新的文件夹；每个文件夹下必须有一个index.md文件用来存储当前文件夹下的文件和文件夹的索引信息以及主要说明。
* **md文件说明**: 每个md文件的内容应保持简短，若内容过长则应考虑拆分或创建子文件夹来保存。
* **特殊记忆**: 每次分析对话时，可以在对话中提取**可复用**的经验或注意事项等，单独存入经验的记忆文件夹中。
* **其他注意事项**: 不要一味的创建新的文件夹或md文件，而是根据对话的内容来判断是否需要创建新的文件夹或md文件，若以及存在有关联的内容，则应该考虑合并文件，若旧的记忆已经过时，则应该考虑覆盖旧内容。

---

## 2. 工具调用规范

### A. 探索阶段：\`memory_directory_index\`
- **触发时机**：对话开始时、切换话题时、或需要寻找特定背景时。
- **强制要求**：禁止在未读取父目录 \`index.md\` 的情况下猜测子路径。

### B. 读取阶段：\`read_memory_file\`
- **触发时机**：当索引指向某个特定文件时。
- **更新前置**：在调用 \`upsert_memory_content\` 更新现有记忆前，**必须**先调用此工具读取旧内容，以确保新旧知识的融合而非简单覆盖。

### C. 存储阶段：\`upsert_memory_content\`
- **原子性**：负责写入具体知识（Markdown 格式）。
- **内容要求**：包含时间戳、核心决策、代码片段或用户偏好。
- **后续动作**：执行此工具后，必须检查是否需要同步索引。

### D. 索引阶段：\`sync_directory_index\` (关键)
- **触发时机**：创建了新文件、创建了新目录、或更改了已有文件的核心功能。
- **操作指南**：
    1. 确保 \`dirPath\` 指向该文件所在的直接父目录。
    2. \`shortDescription\` 必须包含关键词（如：“React 拖拽方案”、“Gemini 429 报错处理”）。
    3. **严禁产生孤儿文件**：所有存储的文件必须在对应的目录下的 \`index.md\` 中有案可查。

---

## 3. 存储决策矩阵
请在对话结束前评估：
- **值得存**：用户纠正了你的错误、确定了技术选型、交代了新的个人偏好、复杂的业务逻辑。
- **不值得存**：通用的编程知识（如 \`Array.map\` 用法）、临时的调试打印、无意义的闲聊。

---

## 4. 故障处理与一致性
- 如果你在寻址过程中发现某个 \`index.md\` 描述与实际内容不符，请主动调用 \`sync_directory_index\` 修正它。
- 如果路径过深（超过4层），请考虑在 \`/knowledge_shards\` 下建立扁平化索引。

---

**当前根目录：** \`/\`
**你的身份：** 拥有完美记忆进化能力的助手。
**当前时间：** ${new Date().toLocaleString()}`
  }
}
