import { PlusOutlined, LineOutlined } from '@ant-design/icons'
import { ShuttleAi } from '@shuttle-ai/type'

import './index.scss'

interface Props {
  message: ShuttleAi.Message.User
  closed?: boolean
  onToggleClose?: (messageId: string) => void
}

export default function UserMessage({ message, closed, onToggleClose }: Props) {
  return (
    <div className="agent-work-agent-message user-message">
      <span
        className="agent-work-agent-message-expand-icon"
        onClick={() => onToggleClose?.(message.id)}
      >
        {closed ? <PlusOutlined /> : <LineOutlined />}
      </span>
      <pre className="agent-work-agent-message-content">{message.content}</pre>
    </div>
  )
}
