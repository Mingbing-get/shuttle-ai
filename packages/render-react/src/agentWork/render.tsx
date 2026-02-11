import { useCallback, useEffect, useRef } from 'react'
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

  const autoScroll = useRef(true)
  const wrapper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!wrapper.current) return

    const observer = new MutationObserver(() => {
      if (!autoScroll.current || !wrapper.current) return

      wrapper.current.scrollTo({ top: wrapper.current.scrollHeight })
    })

    observer.observe(wrapper.current, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!wrapper.current || !e.isTrusted) return

    autoScroll.current =
      Math.abs(
        wrapper.current.scrollHeight -
          wrapper.current.scrollTop -
          wrapper.current.clientHeight,
      ) < 1
  }, [])

  return (
    <div className={classNames('agent-work', className)} style={style}>
      <div className="agent-work-main" ref={wrapper} onScroll={handleScroll}>
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
