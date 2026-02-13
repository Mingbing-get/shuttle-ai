import { useCallback, useEffect, useState } from 'react'
import { Radio, Button, Input, message } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { ShuttleAi } from '@shuttle-ai/type'
import { Agent } from '@shuttle-ai/client'

interface Props {
  toolId: string
  result?: ShuttleAi.Tool.ConfirmResult
  agent: Agent
  getConfirmResult?: () =>
    | Promise<Pick<ShuttleAi.Tool.ConfirmResult, 'result' | 'newArgs'>>
    | Pick<ShuttleAi.Tool.ConfirmResult, 'result' | 'newArgs'>
}

export default function ConfirmRender({
  toolId,
  result,
  agent,
  getConfirmResult,
}: Props) {
  const [type, setType] = useState(
    result?.type === 'reject' ? 'reject' : 'accept',
  )
  const [reason, setReason] = useState(result?.reason || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!result?.type) return

    setType(result.type === 'reject' ? 'reject' : 'accept')
  }, [result?.type])

  useEffect(() => {
    if (!result?.reason) return

    setReason(result.reason)
  }, [result?.reason])

  const handleSubmit = useCallback(async () => {
    if (type === 'reject' && !reason) {
      message.warning('请输入拒绝原因')
      return
    }

    setLoading(true)

    try {
      const result: ShuttleAi.Tool.ConfirmResult =
        type === 'accept'
          ? {
              type: 'confirm',
            }
          : {
              type: 'reject',
              reason,
            }

      if (result.type === 'confirm' && getConfirmResult) {
        const confirmResult = await getConfirmResult()
        if (confirmResult) {
          result.result = confirmResult.result
          result.newArgs = confirmResult.newArgs
          result.type = 'confirmWithResult'
        }
      }

      await agent.confirmTool(toolId, result)
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }, [type, reason, toolId, agent, getConfirmResult])

  const handlePressEnter = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.shiftKey) return

      e.preventDefault()
      handleSubmit()
    },
    [handleSubmit],
  )

  return (
    <div className="fn-tool-confirm">
      <span className="fn-tool-confirm-tip">是否允许执行?</span>
      <div className="fn-tool-confirm-button-group">
        <Radio.Group
          size="small"
          optionType="button"
          value={type}
          disabled={!!result}
          onChange={(v) => setType(v.target.value)}
        >
          <Radio value="accept">接受</Radio>
          <Radio value="reject">拒绝</Radio>
        </Radio.Group>

        <Button
          disabled={!!result}
          size="small"
          type="primary"
          danger={type === 'reject'}
          loading={loading}
          onClick={handleSubmit}
          icon={<SendOutlined />}
        >
          提交
        </Button>
      </div>
      {type === 'reject' && (
        <Input.TextArea
          disabled={!!result}
          placeholder="请输入拒绝原因"
          value={reason}
          onChange={(v) => setReason(v.target.value)}
          rows={3}
          onPressEnter={handlePressEnter}
        />
      )}
    </div>
  )
}
