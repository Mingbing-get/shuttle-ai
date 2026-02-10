import { useMemo } from 'react'
import { Agent } from '@shuttle-ai/client'

import { agentContext } from './base'

interface Props {
  children?: React.ReactNode
  agent: Agent
}

export default function AgentProvider({ children, agent }: Props) {
  const providerValue = useMemo(() => ({ agent }), [agent])

  return (
    <agentContext.Provider value={providerValue}>
      {children}
    </agentContext.Provider>
  )
}
