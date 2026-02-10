import { useMemo } from 'react'

import { useAiMessage } from '../../../hooks'
import { useAgent } from '../../../context'
import MarkdownRender from '../../../markdownRender'
import ToolRender from '../toolRender'
import AgentWorkAgent from '..'

import './index.scss'

interface Props {
  messageId: string
}

export default function AiMessage({ messageId }: Props) {
  const agent = useAgent()
  const message = useAiMessage(agent, messageId)

  const subAgents = useMemo(() => {
    return agent.children.filter((child) =>
      message?.subAgentIds?.includes(child.options.id),
    )
  }, [agent, message?.subAgentIds])

  if (!message) {
    return null
  }

  return (
    <div className="agent-work-agent-message ai-message">
      <div className="ai-message-content">
        <MarkdownRender>{message.content}</MarkdownRender>
      </div>
      {message.toolCalls?.length && (
        <div className="agent-work-agent-tools">
          {message.toolCalls.map((toolCall) => {
            return <ToolRender key={toolCall.id} toolCall={toolCall} />
          })}
        </div>
      )}
      {subAgents.length > 0 && (
        <div className="agent-work-agent-children">
          {subAgents.map((subAgent) => {
            return <AgentWorkAgent key={subAgent.options.id} agent={subAgent} />
          })}
        </div>
      )}
    </div>
  )
}
