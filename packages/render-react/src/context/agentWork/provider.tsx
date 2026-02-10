import { useMemo, useRef } from 'react'
import { ShuttleAi } from '@shuttle-ai/type'
import { AgentWork } from '@shuttle-ai/client'

import { agentWorkContext } from './base'

interface BaseProps {
  children?: React.ReactNode
}

interface WithAgentProps extends BaseProps {
  work: AgentWork
}

interface WorkOptionProps extends BaseProps, ShuttleAi.Client.Work.Options {}

type Props = WithAgentProps | WorkOptionProps

export default function AgentWorkProvider({ children, ...rest }: Props) {
  const work = useRef(createWork(rest))

  const providerValue = useMemo(() => ({ work: work.current }), [])

  return (
    <agentWorkContext.Provider value={providerValue}>
      {children}
    </agentWorkContext.Provider>
  )
}

function createWork(props: Props) {
  if ('work' in props) {
    return props.work
  }

  return new AgentWork(props)
}
