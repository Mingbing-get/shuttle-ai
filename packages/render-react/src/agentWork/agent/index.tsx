import { useCallback, useMemo, useState } from 'react'
import classNames from 'classnames'
import { ShuttleAi } from '@shuttle-ai/type'
import { Agent } from '@shuttle-ai/client'

import { useAgentMessages } from '../../hooks'
import { AgentProvider } from '../../context'
import UserMessage from './userMessage'
import AiMessage from './aiMessage'

interface Porps {
  agent: Agent
  isRoot?: boolean
}

export default function AgentWorkAgent({ agent, isRoot }: Porps) {
  const [closeMessageIds, setCloseMessageIds] = useState<string[]>([])
  const messages = useAgentMessages(agent)

  const showMessages = useMemo(() => {
    const newMessage: (ShuttleAi.Message.User | ShuttleAi.Message.AI)[] = []
    let isClose = false

    for (const message of messages) {
      if (message.role === 'user') {
        isClose = closeMessageIds.includes(message.id)
        newMessage.push(message)
      } else if (message.role === 'assistant' && !isClose) {
        newMessage.push(message)
      }
    }

    return newMessage
  }, [messages, closeMessageIds])

  const handleToggleClose = useCallback((messageId: string) => {
    setCloseMessageIds((old) => {
      if (old.includes(messageId)) {
        return old.filter((id) => id !== messageId)
      }

      return [...old, messageId]
    })
  }, [])

  return (
    <AgentProvider agent={agent}>
      <div
        className={classNames('agent-work-agent', isRoot && 'is-root-agent')}
      >
        {showMessages.map((message) => {
          if (message.role === 'user') {
            return (
              <UserMessage
                key={message.id}
                message={message}
                closed={closeMessageIds.includes(message.id)}
                onToggleClose={handleToggleClose}
              />
            )
          }

          return <AiMessage key={message.id} messageId={message.id} />
        })}
      </div>
    </AgentProvider>
  )
}
