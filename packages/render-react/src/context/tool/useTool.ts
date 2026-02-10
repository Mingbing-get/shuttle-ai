import { useContext } from 'react'

import { toolContext } from './base'

export function useTool() {
  return useContext(toolContext)
}
