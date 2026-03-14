import { AgentWork } from '@shuttle-ai/client'
import { ShuttleAi } from '@shuttle-ai/type'

import { AgentWorkProvider } from '../../context'
import Agent from '../agent'
import { useRootAgent } from '../../hooks'

interface Props {
  work: AgentWork
  context: ShuttleAi.Client.ReactRender.Context
}

export default function WithContextAgent({ work, context }: Props) {
  const rootAgent = useRootAgent(work)

  if (!rootAgent) return null

  return (
    <AgentWorkProvider work={work} context={context}>
      <Agent agent={rootAgent} />
    </AgentWorkProvider>
  )
}
