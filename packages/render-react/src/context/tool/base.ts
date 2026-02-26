import { createContext } from 'react'
import { ShuttleAi } from '@shuttle-ai/type'
import { Agent } from '@shuttle-ai/client'

export interface ToolContext<
  T extends Record<string, any> = Record<string, any>,
> {
  args: T
  agent: Agent
  toolId: string
  content?: string
  confirmResult?: ShuttleAi.Tool.ConfirmResult<T>
  confirm?: (result: ShuttleAi.Tool.ConfirmResult<T>) => Promise<void>
}

export const toolContext = createContext<ToolContext>({
  args: {},
  agent: {} as Agent,
  toolId: '',
})
