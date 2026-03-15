import { useCallback, RefObject, useEffect } from 'react'
import { AgentWork } from '@shuttle-ai/client'

export default function useLoadToScroll(
  works: AgentWork[],
  scrollWrapper: RefObject<HTMLDivElement>,
  onTouchTop: () => void,
) {
  useEffect(() => {
    if (works.length === 0) return

    requestAnimationFrame(() => {
      handleCheck(works)
    })
  }, [works])

  const handleCheck = useCallback((works: AgentWork[]) => {
    if (works.length === 0 || !scrollWrapper.current) return

    const { scrollHeight, clientHeight } = scrollWrapper.current
    if (scrollHeight > clientHeight) return

    const needRenderWorks = works.map((work) => work.getRootAgent()?.options.id)
    for (const id of needRenderWorks) {
      if (!id) continue

      const element = scrollWrapper.current.querySelector(
        `[data-agent-id="${id}"]`,
      )
      if (!element) {
        requestAnimationFrame(() => {
          handleCheck(works)
        })
        return
      }
    }

    onTouchTop()
  }, [])
}
