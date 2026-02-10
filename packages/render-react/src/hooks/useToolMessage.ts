import { useEffect, useState } from 'react'
import { Agent } from '@shuttle-ai/client'
import { ShuttleAi } from '@shuttle-ai/type'

export default function useToolMessage(agent: Agent, messageId: string) {
  const [message, setMessage] = useState<ShuttleAi.Message.Tool>()

  useEffect(() => {
    const off = agent.on('toolMessage', (message) => {
      if (message.id !== messageId) return

      setMessage({ ...message })
    })

    const message = agent.messages.find((message) => {
      return message.role === 'tool' && message.id === messageId
    })
    if (message) {
      setMessage(message as ShuttleAi.Message.Tool)
    }

    return off
  }, [agent, messageId])

  return message
}
