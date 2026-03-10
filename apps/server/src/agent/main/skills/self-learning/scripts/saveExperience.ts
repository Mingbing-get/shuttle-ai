import fs from 'fs'
import path from 'path'

declare namespace NodeJS {
  interface ProcessEnv {
    type: string
    timestamp?: string
    summary?: string
    content?: string
  }
}

const args = process.env

const type = args.type
const timestamp =
  args.timestamp || new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const summary = args.summary || 'Experience'
const content = args.content || ''

if (!type) {
  console.log('ERROR: 缺少 type 参数')
  console.log(
    '用法: saveExperience.js --type <success|failure|pattern> [--timestamp <timestamp>] [--summary <summary>] [--content <content>]',
  )
  process.exit(1)
}

const validTypes = ['success', 'failure', 'pattern']
if (!validTypes.includes(type)) {
  console.log(`ERROR: 无效的类型 '${type}'，必须是 ${validTypes.join(', ')}`)
  process.exit(1)
}

const scriptDir = __dirname
const memoryDir = path.join(scriptDir, '..', 'memory')
const experiencesDir = path.join(memoryDir, 'experiences')
const targetDir = path.join(experiencesDir, type + 's')

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

const filename = `${timestamp}.md`
const filepath = path.join(targetDir, filename)

fs.writeFileSync(filepath, content, 'utf8')

const indexFile = path.join(memoryDir, 'index.md')
const typeTitle = type.charAt(0).toUpperCase() + type.slice(1)
const indexEntry = `- [${timestamp}] [${summary}](${filename})`

if (!fs.existsSync(indexFile) || fs.statSync(indexFile).size === 0) {
  const initialContent = `# Experience Index

## ${typeTitle}

${indexEntry}
`
  fs.writeFileSync(indexFile, initialContent, 'utf8')
} else {
  let indexContent = fs.readFileSync(indexFile, 'utf8')
  const typeHeader = `## ${typeTitle}`

  if (!indexContent.includes(typeHeader)) {
    indexContent += `\n\n## ${typeTitle}\n\n${indexEntry}`
  } else {
    const lines = indexContent.split('\n')
    let newLines = []
    let inTypeSection = false
    let entryAdded = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.startsWith('## ')) {
        if (line === typeHeader) {
          inTypeSection = true
          newLines.push(line)
          if (!entryAdded) {
            newLines.push(indexEntry)
            entryAdded = true
          }
        } else {
          inTypeSection = false
          newLines.push(line)
        }
      } else if (inTypeSection && line.trim() === '' && !entryAdded) {
        newLines.push(line)
        newLines.push(indexEntry)
        entryAdded = true
      } else {
        newLines.push(line)
      }
    }

    indexContent = newLines.join('\n')
  }

  fs.writeFileSync(indexFile, indexContent, 'utf8')
}

console.log(`SUCCESS: 经验已保存到 ${filepath}`)
console.log('SUCCESS: 索引已更新')
