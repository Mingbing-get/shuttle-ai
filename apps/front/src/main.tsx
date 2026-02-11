import { HttpTransporter } from '@shuttle-ai/client'
import { AgentWorkProvider, AgentWorkRender } from '@shuttle-ai/render-react'

import initAgent from './initAgent'

const transporter = new HttpTransporter({
  baseUrl: 'http://localhost:3101/ai',
  requestHeaders: {
    'content-type': 'application/json',
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
    </AgentWorkProvider>
  )
}
