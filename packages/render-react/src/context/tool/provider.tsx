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

  const parseResult = useMemo(() => {
    if (result?.type !== 'success') return result

    let parseContent = result.content
    if (typeof parseContent === 'string') {
      try {
        parseContent = JSON.parse(parseContent)
      } catch (error) {
        // 解析失败，保持原始内容
      }
    }

    return {
      ...result,
      content: parseContent,
    }
  }, [result])

  const providerValue: ToolContext = useMemo(
    () => ({
      args,
      effectArgs,
      agent,
      toolId,
      result: parseResult,
      confirmResult,
      confirm: handleConfirm,
      updateArg,
    }),
    [
      args,
      agent,
      toolId,
      parseResult,
      confirmResult,
      effectArgs,
      handleConfirm,
    ],
  )

  const defaultProps = useMemo(() => {
    if (!run.defaultProps) return {}

    if (typeof run.defaultProps === 'function') {
      return run.defaultProps({
        args,
        result: parseResult,
      })
    }

    return run.defaultProps
  }, [run.defaultProps, args, parseResult])

  return (
    <toolContext.Provider value={providerValue}>
      <run.Render {...defaultProps} />
    </toolContext.Provider>
  )
}
