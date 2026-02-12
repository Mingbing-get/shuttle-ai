import { HttpTransporter } from '@shuttle-ai/client'
import { AgentWorkProvider, AgentWorkRender } from '@shuttle-ai/render-react'
import TestRevoke from './testRevoke'

import initAgent from './initAgent'

const transporter = new HttpTransporter({
  baseUrl: 'http://localhost:3101/ai',
  requestHeaders: {
    'content-type': 'application/json',
  },
  revokeMessage: {
    afterSend: async (response) => {
      response.data = response.data.data
    },
  },
})

export default function Main() {
  return (
    <AgentWorkProvider transporter={transporter} initAgent={initAgent}>
      <AgentWorkRender
        style={{
          boxSizing: 'border-box',
          height: '100vh',
          padding: '20px 60px',
        }}
      />
      {/* <TestRevoke workId="3f58cc5b-d865-4551-abe3-5ed4b4662b5c" /> */}
    </AgentWorkProvider>
  )
}
