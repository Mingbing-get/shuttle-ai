import { ShuttleAi } from '@shuttle-ai/type'

import Render from './render'

const writeTodosTool: ShuttleAi.Client.Agent.WithRunTool = {
  name: 'write_todos',
  description: 'Write todos',
  run: {
    type: 'render',
    Render: Render,
  },
  extras: {
    onlyShow: true,
    disableExport: true,
  },
}

export default writeTodosTool
