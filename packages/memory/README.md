# @shuttle-ai/memory

Shuttle AI 基于文件系统的记忆系统，提供持久化的对话记忆存储和智能检索能力。

## 特性

- 📁 **基于文件系统的持久化存储** - 所有记忆以 Markdown 格式存储在本地文件系统
- 🤖 **智能记忆组织** - 使用 LangChain Agent 自动整理和分类对话内容
- 🔍 **多维度检索** - 支持目录索引、文件读取和全局搜索
- 📊 **Token 使用统计** - 实时跟踪记忆处理过程中的 Token 消耗
- 🏗️ **层级结构** - 支持多级目录结构，便于组织复杂的记忆内容
- 🔄 **自发现机制** - 通过索引文件实现记忆的自动发现和关联

## 安装

```bash
npm install @shuttle-ai/memory
```

## 快速开始

### 基本使用

```typescript
import { OrganizeMemory } from '@shuttle-ai/memory'

const memory = new OrganizeMemory({
  model: 'gpt-4', // 或其他支持的模型
  dir: './memory', // 记忆存储目录
})

// 处理对话消息并存储到记忆系统
const messages = [
  {
    role: 'user',
    content: '我需要创建一个 React 组件来处理用户登录',
  },
  {
    role: 'assistant',
    content: '好的，我可以帮你创建一个登录组件...',
  },
]

const tokenUsage = await memory.start(messages)
console.log('Token 使用情况:', tokenUsage)
```

### 创建记忆工具

```typescript
import { createUseMemoryTools } from '@shuttle-ai/memory'

const memoryTools = createUseMemoryTools({
  dir: './memory',
})

// 将工具集成到你的 Agent 中
const agent = createAgent({
  model: 'gpt-4',
  tools: memoryTools,
})
```

## API 文档

### OrganizeMemory

#### 构造函数

```typescript
constructor(options: OrganizeMemoryOptions)
```

**参数:**

- `options.model` - 使用的 AI 模型
- `options.dir` - 记忆存储的根目录路径

#### 方法

##### start(messages)

处理对话消息并存储到记忆系统。

```typescript
async start(messages: Message[]): Promise<TokenUsage>
```

**参数:**

- `messages` - 对话消息数组

**返回:**

- `TokenUsage` - Token 使用统计信息

### createUseMemoryTools

创建用于读取和搜索记忆的工具集。

```typescript
function createUseMemoryTools(options: CreateUseMemoryOptions): Tool[]
```

**参数:**

- `options.dir` - 记忆存储的根目录路径

**返回:**

- `Tool[]` - LangChain 工具数组，包含以下工具：
  - `memory_directory_index` - 读取目录索引
  - `read_memory_file` - 读取记忆文件
  - `search_memory_globally` - 全局搜索记忆

## 工具说明

### memory_directory_index

读取指定目录下的 `index.md` 文件内容，了解目录结构和文件描述。

**参数:**

- `path` - 目标目录的相对路径

**示例:**

```typescript
const result = await memory_directory_index({ path: '/projects' })
```

### read_memory_file

读取指定 `.md` 文件的完整内容，用于检索具体的代码片段、配置信息或历史经验。

**参数:**

- `filePath` - 文件的完整路径

**示例:**

```typescript
const result = await read_memory_file({ filePath: '/projects/react-login.md' })
```

### search_memory_globally

在整个记忆根目录下执行关键词搜索，支持文件名和标题的模糊匹配。

**参数:**

- `query` - 用于搜索的正则表达式

**示例:**

```typescript
const result = await search_memory_globally({ query: 'React.*登录' })
```

### upsert_memory_content

更新或创建记忆文件的内容。

**参数:**

- `filePath` - 记忆文件的路径（相对根目录）
- `content` - 记忆文件的内容

### sync_directory_index

同步目录索引，确保所有目录下的 `index.md` 文件与实际内容一致。

**参数:**

- `path` - 目录路径（相对根目录）
- `content` - `index.md` 文件的完整内容

## 记忆组织原则

系统遵循以下原则来组织记忆：

1. **自发现机制** - 从根目录的 `index.md` 开始，逐级探索
2. **文件夹相关性** - 每个文件夹下的内容必须高度相关
3. **索引完整性** - 每个文件夹必须有 `index.md` 文件
4. **内容简洁性** - 每个文件内容保持简短，过长则考虑拆分
5. **经验复用** - 提取可复用的经验和注意事项单独存储
6. **避免冗余** - 不一味创建新文件，优先合并相关内容

## 存储决策

系统会根据以下标准决定是否存储内容：

**值得存储:**

- 用户纠正的错误
- 确定的技术选型
- 新的个人偏好
- 复杂的业务逻辑
- 可复用的经验

**不值得存储:**

- 通用的编程知识
- 临时的调试信息
- 无意义的闲聊

## 配置选项

### OrganizeMemoryOptions

```typescript
interface OrganizeMemoryOptions {
  model: string // AI 模型名称
  dir: string // 记忆存储目录
}
```

### CreateUseMemoryOptions

```typescript
interface CreateUseMemoryOptions {
  dir: string // 记忆存储目录
}
```

## 示例项目结构

```
memory/
├── index.md                          # 根目录索引
├── projects/
│   ├── index.md                      # 项目索引
│   ├── react-login.md               # React 登录组件
│   └── api-integration.md           # API 集成文档
├── experiences/
│   ├── index.md                      # 经验索引
│   ├── debugging-tips.md            # 调试技巧
│   └── best-practices.md            # 最佳实践
└── preferences/
    ├── index.md                      # 偏好索引
    └── coding-style.md              # 编码风格
```

## 依赖

- `@shuttle-ai/type` - 类型定义
- `langchain` - LangChain 框架
- `@langchain/core` - LangChain 核心
- `@langchain/openai` - OpenAI 集成
- `glob` - 文件匹配
- `zod` - 数据验证

## 许可证

MIT
