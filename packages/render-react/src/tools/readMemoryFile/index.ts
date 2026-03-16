import { ShuttleAi } from '@shuttle-ai/type'

import Render from './render'

const ReadMemoryFileTool: ShuttleAi.Client.Agent.WithRunTool = {
  name: 'read_memory_file',
  description: '读取指定记忆文件的内容',
  label: '读取记忆文件内容',
  run: {
    type: 'render',
    Render: Render,
  },
  extras: {
    scope: 'read',
    disableExport: true,
  },
}

export default ReadMemoryFileTool
