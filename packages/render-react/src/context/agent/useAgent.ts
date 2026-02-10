import { useContext } from 'react'

import { agentContext } from './base'

export function useAgent() {
  return useContext(agentContext).agent
}
