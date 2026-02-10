import { createContext } from 'react'

import { Agent } from '@shuttle-ai/client'

export const agentContext = createContext<{
  agent: Agent
}>({
  agent: null as any,
})
