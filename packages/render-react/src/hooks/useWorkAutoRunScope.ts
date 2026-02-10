import { AgentWork } from '@shuttle-ai/client'
import { useEffect, useState } from 'react'

export default function useWorkAutoRunScope(work: AgentWork) {
  const [scope, setScope] = useState(work.autoRunScope)

  useEffect(() => {
    const removeListener = work.on('autoRunScope', () => {
      setScope(work.autoRunScope)
    })

    return removeListener
  }, [])

  return scope
}
