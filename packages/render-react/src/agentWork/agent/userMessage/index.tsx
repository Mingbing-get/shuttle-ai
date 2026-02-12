import { useCallback, useState } from 'react'
import { PlusOutlined, LineOutlined, LoadingOutlined } from '@ant-design/icons'
import { Spin } from 'antd'
import { ShuttleAi } from '@shuttle-ai/type'

import './index.scss'

interface Props {
  message: ShuttleAi.Message.User
  closed?: boolean
  onToggleClose?: (messageId: string) => void | Promise<void>
}

export default function UserMessage({ message, closed, onToggleClose }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleClose = useCallback(async () => {
    if (isLoading) return

    setIsLoading(true)
    await onToggleClose?.(message.id)
    setIsLoading(false)
  }, [onToggleClose, message.id, isLoading])

  return (
    <div className="agent-work-agent-message user-message">
      <span
        className="agent-work-agent-message-expand-icon"
        onClick={handleToggleClose}
      >
        {isLoading ? (
          <Spin indicator={<LoadingOutlined spin />} size="small" />
        ) : closed ? (
          <PlusOutlined />
        ) : (
          <LineOutlined />
        )}
      </span>
      <pre className="agent-work-agent-message-content">{message.content}</pre>
    </div>
  )
}
