import { useEffect, useState } from 'react'
import { Agent } from '@shuttle-ai/client'
import { ShuttleAi } from '@shuttle-ai/type'

export default function useAiMessage(agent: Agent, messageId: string) {
  const [message, setMessage] = useState<ShuttleAi.Message.AI>()

  useEffect(() => {
    const off = agent.on('aiMessage', (message) => {
      if (message.id !== messageId) return

      setMessage({ ...message })
    })

    const message = agent.messages.find((message) => {
      return message.role === 'assistant' && message.id === messageId
    })
    if (message) {
      setMessage(message as ShuttleAi.Message.AI)
    }

    return off
  }, [agent, messageId])

  return message
}
