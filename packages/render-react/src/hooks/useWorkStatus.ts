import { AgentWork } from '@shuttle-ai/client'
import { useEffect, useState } from 'react'

export default function useWorkStatus(work: AgentWork) {
  const [status, setStatus] = useState(work.status)

  useEffect(() => {
    const removeListener = work.on('status', () => {
      setStatus(work.status)
    })

    return removeListener
  }, [])

  return status
}
