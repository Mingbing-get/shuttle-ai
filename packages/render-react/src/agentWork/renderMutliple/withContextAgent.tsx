import { useMemo } from 'react'
import { AgentWork } from '@shuttle-ai/client'
import { ShuttleAi } from '@shuttle-ai/type'

import Agent from '../agent'
import { useRootAgent } from '../../hooks'
import { agentWorkContext } from '../../context/agentWork/base'

interface Props {
  work: AgentWork
  context: ShuttleAi.Client.ReactRender.Context
}

export default function WithContextAgent({ work, context }: Props) {
  const rootAgent = useRootAgent(work)

  const providerValue = useMemo(
    () => ({ work: work, context }),
    [context, work],
  )

  if (!rootAgent) return null

  return (
    <agentWorkContext.Provider value={providerValue}>
      <Agent agent={rootAgent} />
    </agentWorkContext.Provider>
  )
}
