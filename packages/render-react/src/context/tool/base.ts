import { createContext } from 'react'
import { ShuttleAi } from '@shuttle-ai/type'

export interface ToolContext<
  T extends Record<string, any> = Record<string, any>,
> {
  args: T
  confirmResult?: ShuttleAi.Tool.ConfirmResult
  confirm?: (result: ShuttleAi.Tool.ConfirmResult) => Promise<void>
}

export const toolContext = createContext<ToolContext>({
  args: {},
})
