import { AgentWork, HttpTransporter } from '@shuttle-ai/client'
import { useCallback } from 'react'

const transporter = new HttpTransporter({
  baseUrl: 'http://localhost:3101/ai',
})

export default function Main() {
  const handleClick = useCallback(async () => {
    const agentWork = new AgentWork({ transporter })

    await agentWork.invoke('你好')
  }, [])

  return <button onClick={handleClick}>发送</button>
}
