import { createContext } from 'react'
import { ShuttleAi } from '@shuttle-ai/type'

export const toolContext = createContext<{
  args: Record<string, any>
  confirmResult?: ShuttleAi.Tool.ConfirmResult
  confirm?: (result: ShuttleAi.Tool.ConfirmResult) => Promise<void>
}>({
  args: {},
})
