import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'
import { Empty } from 'antd'
import { AgentWork } from '@shuttle-ai/client'
import { ShuttleAi } from '@shuttle-ai/type'

import { AgentWorkProvider } from '../../context'
import WithContextAgent from './withContextAgent'
import Action from '../action'
import { useRootAgent } from '../../hooks'

interface Props extends ShuttleAi.Client.Work.Options {
  className?: string
  style?: React.CSSProperties
  empty?: React.ReactNode
  extraActions?: React.ReactNode
  disabled?: boolean
  works: AgentWork[]
  context: ShuttleAi.Client.ReactRender.Context
  onAutoRunScopeChange?: (autoRunScope: string) => void
  onTouchTop?: () => void
  topLoading?: React.ReactNode
}

export default function AgentWorkRender({
  className,
  style,
  empty,
  extraActions,
  disabled,
  works,
  context,
  transporter,
  initAgent,
  autoRunScope,
  onAutoRunScopeChange,
  onTouchTop,
  topLoading,
}: Props) {
  const autoScroll = useRef(true)
  const wrapper = useRef<HTMLDivElement>(null)
  const [showWorks, setShowWorks] = useState(works)
  const [currentWork, setCurrentWork] = useState<AgentWork>(
    new AgentWork({
      transporter,
      initAgent,
      autoRunScope,
    }),
  )
  const currentWorkRef = useRef(currentWork)
  const currentRootAgent = useRootAgent(currentWork)

  useEffect(() => {
    currentWorkRef.current = currentWork
  }, [currentWork])

  useEffect(() => {
    setShowWorks(works)
  }, [works])

  useEffect(() => {
    currentWorkRef.current.setAutoRunScope(autoRunScope || 'none')
  }, [autoRunScope])

  useEffect(() => {
    const offStatus = currentWork.on('status', () => {
      if (currentWork.status === 'idle') {
        setCurrentWork(
          new AgentWork({
            transporter,
            initAgent,
            autoRunScope: currentWork.autoRunScope,
          }),
        )
        setShowWorks((old) => [...old, currentWork])
      }
    })

    const offAutoScope = currentWork.on('autoRunScope', () => {
      onAutoRunScopeChange?.(currentWork.autoRunScope)
    })

    return () => {
      offStatus()
      offAutoScope()
    }
  }, [currentWork])

  useEffect(() => {
    if (!wrapper.current) return

    const observer = new MutationObserver(() => {
      if (!autoScroll.current || !wrapper.current) return

      wrapper.current.scrollTo({ top: wrapper.current.scrollHeight })
    })

    observer.observe(wrapper.current, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => observer.disconnect()
  }, [])

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!wrapper.current || !e.isTrusted) return

      if (wrapper.current.scrollTop === 0) {
        onTouchTop?.()
      }

      autoScroll.current =
        Math.abs(
          wrapper.current.scrollHeight -
            wrapper.current.scrollTop -
            wrapper.current.clientHeight,
        ) < 8
    },
    [onTouchTop],
  )

  const isEmpty = useMemo(
    () => showWorks.length === 0 && !currentRootAgent,
    [showWorks, currentRootAgent],
  )

  return (
    <div className={classNames('agent-work', className)} style={style}>
      <div className="agent-work-main" ref={wrapper} onScroll={handleScroll}>
        {topLoading}
        {showWorks.map((work) => (
          <WithContextAgent key={work.id} work={work} context={context} />
        ))}
        <WithContextAgent work={currentWork} context={context} />
        {isEmpty && (empty || <Empty description="暂无聊天" />)}
      </div>
      <AgentWorkProvider work={currentWork} context={context}>
        <Action disabled={disabled} extraActions={extraActions} />
      </AgentWorkProvider>
    </div>
  )
}
