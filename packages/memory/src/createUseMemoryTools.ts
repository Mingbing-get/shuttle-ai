import { ShuttleAi } from '@shuttle-ai/type'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { resolve } from 'path'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { glob } from 'glob'

export default function createUseMemoryTools(
  options: ShuttleAi.Memory.CreateUseMemoryOptions,
) {
  return [
    tool(
      async ({ path }) => {
        if (!path.endsWith('index.md')) {
          path = path.endsWith('/') ? `${path}index.md` : `${path}/index.md`
        }

        if (path.startsWith('/')) {
          path = `.${path}`
        }

        const absPath = resolve(options.dir, path)

        if (!existsSync(absPath)) {
          return ''
        }

        const content = await readFile(absPath, 'utf-8')
        return content
      },
      {
        name: 'memory_directory_index',
        description:
          '读取指定目录下的 index.md 文件内容。模型应从根目录 / 开始，通过此工具了解当前目录的结构和每个文件的简要描述。',
        schema: z.object({
          path: z.string().describe('目标目录的相对路径。'),
        }),
        extras: {
          scope: 'read',
        },
      },
    ),

    tool(
      async ({ filePath }) => {
        if (filePath.startsWith('/')) {
          filePath = `.${filePath}`
        }

        const absPath = resolve(options.dir, filePath)

        if (!existsSync(absPath)) {
          return ''
        }

        const content = await readFile(absPath, 'utf-8')
        return content
      },
      {
        name: 'read_memory_file',
        description:
          '读取并返回指定 .md 文件的完整文本内容。用于检索具体的代码片段、配置信息或历史经验。',
        schema: z.object({
          filePath: z.string().describe('文件的完整路径。'),
        }),
        extras: {
          scope: 'read',
        },
      },
    ),

    tool(
      async ({ query }) => {
        const files = await glob('**/index.md', {
          cwd: options.dir,
          absolute: true,
        })

        const contents: {
          path: string
          content: string
        }[] = []
        for (const file of files) {
          const content = await readFile(file, 'utf-8')
          const regex = new RegExp(query, 'i')
          if (regex.test(content)) {
            contents.push({
              path: file.replace(options.dir, ''),
              content,
            })
            if (contents.length >= 5) {
              break
            }
          }
        }

        return JSON.stringify(contents)
      },
      {
        name: 'search_memory_globally',
        description:
          '在整个记忆根目录下执行关键词搜索（文件名或标题）。当模型在当前索引中找不到线索时，可以使用此工具进行全局模糊匹配。',
        schema: z.object({
          query: z.string().describe('用于搜索的正则表达式。'),
        }),
        extras: {
          scope: 'read',
        },
      },
    ),
  ]
}
