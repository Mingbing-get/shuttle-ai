import { useEffect, useState } from 'react'
import { Agent } from '@shuttle-ai/client'

export default function useAgentStatus(agent: Agent) {
  const [status, setStatus] = useState(agent.status)

  useEffect(() => {
    const off = agent.on('status', (status) => {
      setStatus(status)
    })

    return off
  }, [agent])

  return status
}
