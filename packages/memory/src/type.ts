import { CreateAgentParams } from 'langchain'

import '@shuttle-ai/type'

declare module '@shuttle-ai/type' {
  export namespace ShuttleAi {
    export namespace Memory {
      export interface CreateUseMemoryOptions {
        dir: string
      }

      export interface OrganizeMemoryOptions {
        model: CreateAgentParams['model']
        dir: string
      }
    }
  }
}
