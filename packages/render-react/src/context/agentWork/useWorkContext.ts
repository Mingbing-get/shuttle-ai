import { useContext } from 'react'

import { agentWorkContext } from './base'

export function useWorkContext() {
  return useContext(agentWorkContext).context
}
