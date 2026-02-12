import { useContext } from 'react'

import { toolContext, ToolContext } from './base'

export function useTool<T extends Record<string, any> = Record<string, any>>() {
  return useContext(toolContext) as ToolContext<T>
}
