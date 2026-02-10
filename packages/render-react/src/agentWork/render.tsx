import classNames from 'classnames'

import Agent from './agent'
import Action from './action'

interface Props {
  className?: string
  style?: React.CSSProperties
}

export default function AgentWorkRender({ className, style }: Props) {
  return (
    <div className={classNames('agent-work', className)} style={style}>
      <Agent />
      <Action />
    </div>
  )
}
