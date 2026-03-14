import { AgentWork, Agent } from '@shuttle-ai/client'
import { useEffect, useState } from 'react'

export default function useRootAgent(work: AgentWork) {
  const [rootAgent, setRootAgent] = useState<Agent>()

  useEffect(() => {
    const removeListener = work.on('agent', () => {
      setRootAgent(work.getRootAgent())
    })

    setRootAgent(work.getRootAgent())

    return removeListener
  }, [work])

  return rootAgent
}
