import { useCallback, useEffect, useMemo, useState } from 'react'
import { Agent } from '@shuttle-ai/client'
import { ShuttleAi } from '@shuttle-ai/type'

import { toolContext, ToolContext } from './base'

interface Props {
  args: Record<string, any>
  result?: ShuttleAi.Tool.Result
  toolId: string
  confirmResult?: ShuttleAi.Tool.ConfirmResult
  agent: Agent
  run: ShuttleAi.Client.Agent.RenderTool
}

export default function ToolProvider({
  args,
  result,
  toolId,
  confirmResult,
  agent,
  run,
}: Props) {
  const handleConfirm = useCallback(
    (result: ShuttleAi.Tool.ConfirmResult) => agent.confirmTool(toolId, result),
    [agent, toolId],
  )
  const [effectArgs, setEffectArgs] = useState(confirmResult?.newArgs || args)

  useEffect(() => {
    setEffectArgs(confirmResult?.newArgs || args)
  }, [confirmResult?.newArgs, args])

  const updateArg = useCallback((paths: string[], v: any) => {
    setEffectArgs((old) => {
      const newEffectArgs = { ...old }
      let current = newEffectArgs
      for (let i = 0; i < paths.length; i++) {
        const path = paths[i]
        if (i === paths.length - 1) {
          current[path] = v
        } else {
          current = { ...current[path] }
        }
      }
      return newEffectArgs
    })
  }, [])

  const providerValue: ToolContext = useMemo(
    () => ({
      args,
      effectArgs,
      agent,
      toolId,
      result,
      confirmResult,
      confirm: handleConfirm,
      updateArg,
    }),
    [args, agent, toolId, result, confirmResult, effectArgs, handleConfirm],
  )

  const defaultProps = useMemo(() => {
    if (!run.defaultProps) return {}

    if (typeof run.defaultProps === 'function') {
      return run.defaultProps({
        args,
        result,
      })
    }

    return run.defaultProps
  }, [run.defaultProps, args, result])

  return (
    <toolContext.Provider value={providerValue}>
      <run.Render {...defaultProps} />
    </toolContext.Provider>
  )
}
