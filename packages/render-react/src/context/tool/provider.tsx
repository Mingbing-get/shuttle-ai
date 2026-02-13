import { useCallback, useMemo } from 'react'
import { Agent } from '@shuttle-ai/client'
import { ShuttleAi } from '@shuttle-ai/type'

import { toolContext } from './base'

interface Props {
  args: Record<string, any>
  content?: string
  toolId: string
  confirmResult?: ShuttleAi.Tool.ConfirmResult
  agent: Agent
  run: ShuttleAi.Client.Agent.RenderTool
}

export default function ToolProvider({
  args,
  content,
  toolId,
  confirmResult,
  agent,
  run,
}: Props) {
  const handleConfirm = useCallback(
    (result: ShuttleAi.Tool.ConfirmResult) => agent.confirmTool(toolId, result),
    [agent, toolId],
  )

  const providerValue = useMemo(
    () => ({
      args,
      agent,
      toolId,
      content,
      confirmResult,
      confirm: handleConfirm,
    }),
    [args, agent, toolId, content, confirmResult, handleConfirm],
  )

  const defaultProps = useMemo(() => {
    if (!run.defaultProps) return {}

    if (typeof run.defaultProps === 'function') {
      return run.defaultProps({
        args,
        content,
      })
    }

    return run.defaultProps
  }, [run.defaultProps, args, content])

  return (
    <toolContext.Provider value={providerValue}>
      <run.Render {...defaultProps} />
    </toolContext.Provider>
  )
}
