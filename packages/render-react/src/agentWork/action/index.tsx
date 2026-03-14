import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, Select } from 'antd'
import { SendOutlined, PauseOutlined } from '@ant-design/icons'

import { useWork } from '../../context'
import { useWorkStatus, useWorkAutoRunScope } from '../../hooks'

import './index.scss'

interface Props {
  disabled?: boolean
  extraActions?: React.ReactNode
}

export default function AgentWorkAction({ disabled, extraActions }: Props) {
  const [inputValue, setInputValue] = useState('')
  const work = useWork()
  const status = useWorkStatus(work)
  const scope = useWorkAutoRunScope(work)

  useEffect(() => {
    if (status === 'running') {
      setInputValue('')
    }
  }, [status])

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

  const autoRunOptions = useMemo(
    () => [
      {
        label: '自动执行所有',
        value: 'always',
      },
      {
        label: '自动执行只读',
        value: 'read',
      },
      {
        label: '手动执行',
        value: 'none',
      },
    ],
    [],
  )

  const handleStop = useCallback(() => {
    work.stop()
  }, [])

  return (
    <div className="agent-work-action">
      <Input.TextArea
        disabled={status !== 'idle' || disabled}
        onPressEnter={handlePressEnter}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="agent-work-action-input"
        autoSize={false}
      />
      <div className="agent-work-action-btns">
        {extraActions}
        <Select
          style={{ minWidth: 130 }}
          disabled={status !== 'idle' || disabled}
          value={scope}
          options={autoRunOptions}
          onChange={(value) => work.setAutoRunScope(value)}
        />
        {status === 'running' ? (
          <Button
            onClick={handleStop}
            type="primary"
            icon={<PauseOutlined />}
          />
        ) : (
          <Button
            disabled={status !== 'idle' || !inputValue || disabled}
            loading={status === 'pending'}
            onClick={handleSend}
            type="primary"
            icon={<SendOutlined />}
          />
        )}
      </div>
    </div>
  )
}
