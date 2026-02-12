import { createContext } from 'react'

import { AgentWork } from '@shuttle-ai/client'
import { ShuttleAi } from '@shuttle-ai/type'

export const agentWorkContext = createContext<{
  work: AgentWork
  context: ShuttleAi.Client.ReactRender.Context
}>({
  work: null as any,
  context: {},
})
