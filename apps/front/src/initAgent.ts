import { ShuttleAi } from '@shuttle-ai/type'
import '@shuttle-ai/client'
import '@shuttle-ai/render-react'
import CreateModel from './createModel'

const initAgent: Record<string, ShuttleAi.Client.Agent.WithRunToolParams> = {
  main_agent: {
    subAgents: [
      {
        name: 'screen_agent',
        description:
          'You are a screen agent, you can get the size of the screen',
      },
    ],
  },
  screen_agent: {
    systemPrompt: 'You are a screen agent, you can get the size of the screen',
    tools: [
      {
        name: 'get_screen_size',
        description: 'get the size of the screen',
        run: {
          type: 'fn',
          fn: async () => {
            return {
              width: window.innerWidth,
              height: window.innerHeight,
            }
          },
        },
        extras: {
          scope: 'read',
        },
      },
    ],
  },
  model_agent: {
    tools: [
      {
        name: 'create_model',
        description: 'create a model',
        run: {
          type: 'render',
          Render: CreateModel,
        },
        extras: {
          disableExport: true,
        },
      },
    ],
  },
}

export default initAgent
