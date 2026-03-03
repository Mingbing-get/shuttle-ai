import { createContext } from 'react'
import { ShuttleAi } from '@shuttle-ai/type'
import { Agent } from '@shuttle-ai/client'

export interface ToolContext<
  T extends Record<string, any> = Record<string, any>,
  R = any,
> {
  args: T
  effectArgs: T
  agent: Agent
  toolId: string
  result?: ShuttleAi.Tool.Result<R>
  confirmResult?: ShuttleAi.Tool.ConfirmResult<T>
  confirm?: (result: ShuttleAi.Tool.ConfirmResult<T>) => Promise<void>
  updateArg: <P extends ObjectArrayPaths<T>>(
    paths: P,
    v: PathValue<T, P>,
  ) => void
}

export const toolContext = createContext<ToolContext>({
  args: {},
  effectArgs: {},
  agent: {} as Agent,
  toolId: '',
  updateArg: () => {},
})

type ObjectArrayPaths<
  T,
  Prefix extends string[] = [],
  Depth extends number = 6,
  Counter extends unknown[] = [],
> = Counter['length'] extends Depth
  ? never
  : T extends Record<string, any>
    ? {
        [K in keyof T]: K extends string
          ?
              | [...Prefix, K]
              | ObjectArrayPaths<T[K], [...Prefix, K], Depth, [...Counter, 1]>
          : never
      }[keyof T]
    : never

// 工具类型：根据路径数组推断值类型
type PathValue<T, P extends string[]> = P extends []
  ? T
  : P extends [infer First, ...infer Rest]
    ? First extends keyof T
      ? Rest extends []
        ? T[First]
        : Rest extends string[]
          ? PathValue<T[First], Rest>
          : never
      : never
    : never
