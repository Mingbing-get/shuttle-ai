import { useCallback, useMemo } from 'react'
import { Agent } from '@shuttle-ai/client'
import { ShuttleAi } from '@shuttle-ai/type'

import { toolContext } from './base'

interface Props {
  children?: React.ReactNode
  args: Record<string, any>
  content?: string
  toolId: string
  confirmResult?: ShuttleAi.Tool.ConfirmResult
  agent: Agent
}

export default function ToolProvider({
  children,
  args,
  content,
  toolId,
  confirmResult,
  agent,
}: Props) {
  const handleConfirm = useCallback(
    (result: ShuttleAi.Tool.ConfirmResult) => agent.confirmTool(toolId, result),
    [agent, toolId],
  )

  const providerValue = useMemo(
    () => ({ args, content, confirmResult, confirm: handleConfirm }),
    [args, content, confirmResult, handleConfirm],
  )

  return (
    <toolContext.Provider value={providerValue}>
      {children}
    </toolContext.Provider>
  )
}
