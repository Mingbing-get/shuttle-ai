import { ShuttleAi } from '@shuttle-ai/type'

import Render from './render'

const memoryDirectoryIndexTool: ShuttleAi.Client.Agent.WithRunTool = {
  name: 'memory_directory_index',
  description: '读取指定记忆目录的索引',
  label: '读取记忆目录索引',
  run: {
    type: 'render',
    Render: Render,
  },
  extras: {
    scope: 'read',
    disableExport: true,
  },
}

export default memoryDirectoryIndexTool
