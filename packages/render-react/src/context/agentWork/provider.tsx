import { useMemo, useRef } from 'react'
import { ShuttleAi } from '@shuttle-ai/type'
import { AgentWork } from '@shuttle-ai/client'

import { agentWorkContext } from './base'

interface BaseProps {
  children?: React.ReactNode
  context: ShuttleAi.Client.ReactRender.Context
}

interface WithAgentProps extends BaseProps {
  work: AgentWork
}

interface WorkOptionProps extends BaseProps, ShuttleAi.Client.Work.Options {}

type Props = WithAgentProps | WorkOptionProps

export default function AgentWorkProvider({
  children,
  context,
  ...rest
}: Props) {
  const work = useRef(createWork(rest))

  const providerValue = useMemo(
    () => ({ work: work.current, context }),
    [context],
  )

  return (
    <agentWorkContext.Provider value={providerValue}>
      {children}
    </agentWorkContext.Provider>
  )
}

function createWork(
  props:
    | Omit<WithAgentProps, keyof BaseProps>
    | Omit<WorkOptionProps, keyof BaseProps>,
) {
  if ('work' in props) {
    return props.work
  }

  return new AgentWork(props)
}
