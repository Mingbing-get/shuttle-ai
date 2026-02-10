import { useContext } from 'react'

import { agentWorkContext } from './base'

export function useWork() {
  return useContext(agentWorkContext).work
}
