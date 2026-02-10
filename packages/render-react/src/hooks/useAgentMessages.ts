import { useEffect, useState } from 'react'
import { Agent } from '@shuttle-ai/client'

export default function useAgentMessages(agent: Agent) {
  const [messages, setMessages] = useState(agent.messages)

  useEffect(() => {
    const off = agent.on('messages', (messages) => {
      setMessages([...messages])
    })

    return off
  }, [agent])

  return messages
}
