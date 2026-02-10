import { createContext } from 'react'

import { AgentWork } from '@shuttle-ai/client'

export const agentWorkContext = createContext<{
  work: AgentWork
}>({
  work: null as any,
})
