import classNames from 'classnames'
import { Empty } from 'antd'

import { useWork } from '../context'
import { useRootAgent } from '../hooks'
import Agent from './agent'
import Action from './action'

interface Props {
  className?: string
  style?: React.CSSProperties
  empty?: React.ReactNode
}

export default function AgentWorkRender({ className, style, empty }: Props) {
  const work = useWork()
  const rootAgent = useRootAgent(work)

  return (
    <div className={classNames('agent-work', className)} style={style}>
      <div className="agent-work-main">
        {rootAgent ? (
          <Agent agent={rootAgent} />
        ) : (
          empty || <Empty description="暂无聊天" />
        )}
      </div>
      <Action />
    </div>
  )
}
