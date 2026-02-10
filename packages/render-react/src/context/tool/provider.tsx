import { useCallback, useMemo } from 'react'
import { Agent } from '@shuttle-ai/client'
import { ShuttleAi } from '@shuttle-ai/type'

import { toolContext } from './base'

interface Props {
  children?: React.ReactNode
  args: Record<string, any>
  toolId: string
  confirmResult?: ShuttleAi.Tool.ConfirmResult
  agent: Agent
}

export default function ToolProvider({
  children,
  args,
  toolId,
  confirmResult,
  agent,
}: Props) {
  const handleConfirm = useCallback(
    (result: ShuttleAi.Tool.ConfirmResult) => agent.confirmTool(toolId, result),
    [agent, toolId],
  )

  const providerValue = useMemo(
    () => ({ args, confirmResult, confirm: handleConfirm }),
    [args, confirmResult, handleConfirm],
  )

  return (
    <toolContext.Provider value={providerValue}>
      {children}
    </toolContext.Provider>
  )
}
