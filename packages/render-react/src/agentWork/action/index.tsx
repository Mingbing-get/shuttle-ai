import { useCallback, useEffect, useState } from 'react'
import { Button, Input } from 'antd'
import { ShuttleAi } from '@shuttle-ai/type'
import { SendOutlined } from '@ant-design/icons'

import { useWork } from '../../context'

import './index.scss'

export default function AgentWorkAction() {
  const [status, setStatus] = useState<ShuttleAi.Client.Work.Status>('idle')
  const [inputValue, setInputValue] = useState('')
  const work = useWork()

  useEffect(() => {
    const removeListener = work.on('status', () => {
      setStatus(work.status)

      if (work.status === 'running') {
        setInputValue('')
      }
    })

    return removeListener
  }, [])

  const handleSend = useCallback(() => {
    if (!inputValue) return

    work.invoke(inputValue)
  }, [inputValue])

  const handlePressEnter = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.shiftKey) return

      e.preventDefault()
      handleSend()
    },
    [handleSend],
  )

  return (
    <div className="agent-work-action">
      <Input.TextArea
        disabled={status !== 'idle'}
        onPressEnter={handlePressEnter}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="agent-work-action-input"
        autoSize={false}
      />
      <div className="agent-work-action-btns">
        <Button
          disabled={status !== 'idle'}
          loading={status === 'pending' || status === 'running'}
          onClick={handleSend}
          type="primary"
          icon={<SendOutlined />}
        />
      </div>
    </div>
  )
}
