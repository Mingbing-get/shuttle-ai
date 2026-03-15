import { useCallback, useRef } from 'react'
import { AgentWork } from '@shuttle-ai/client'
import { useRefCallback } from '../../hooks'

export default function useKeepScroll(works: AgentWork[]) {
  const firstWorkRootAgentId = useRef<string>()

  const _markFirstWorkRootAgent = useCallback(() => {
    if (works.length === 0) return

    firstWorkRootAgentId.current = works[0].getRootAgent()?.options.id
  }, [works])

  const markFirstWorkRootAgent = useRefCallback(_markFirstWorkRootAgent)

  const _scrollToFirstWorkRootAgent = useCallback(() => {
    if (!firstWorkRootAgentId.current) return

    const currentFirstWorkRootAgentId = works[0]?.getRootAgent()?.options.id
    if (
      !currentFirstWorkRootAgentId ||
      currentFirstWorkRootAgentId === firstWorkRootAgentId.current
    ) {
      return
    }

    const currentFirstElement = document.querySelector(
      `[data-agent-id="${currentFirstWorkRootAgentId}"]`,
    )
    if (!currentFirstElement) {
      requestAnimationFrame(() => {
        scrollToFirstWorkRootAgent()
      })
      return
    }

    const element = document.querySelector(
      `[data-agent-id="${firstWorkRootAgentId.current}"]`,
    )
    firstWorkRootAgentId.current = undefined
    if (!element) return

    requestAnimationFrame(() => {
      element.scrollIntoView()
    })
  }, [works])

  const scrollToFirstWorkRootAgent = useRefCallback(_scrollToFirstWorkRootAgent)

  return {
    markFirstWorkRootAgent,
    scrollToFirstWorkRootAgent,
  }
}
