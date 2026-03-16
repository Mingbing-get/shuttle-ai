import { ShuttleAi } from '@shuttle-ai/type'

import Render from './render'

const SearchMemoryGloballyTool: ShuttleAi.Client.Agent.WithRunTool = {
  name: 'search_memory_globally',
  description: '全局搜索记忆',
  label: '全局搜索记忆',
  run: {
    type: 'render',
    Render: Render,
  },
  extras: {
    scope: 'read',
    disableExport: true,
  },
}

export default SearchMemoryGloballyTool
