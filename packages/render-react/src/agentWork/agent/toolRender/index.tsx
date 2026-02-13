import { useMemo } from 'react'
import { ShuttleAi } from '@shuttle-ai/type'

import { useToolMessage } from '../../../hooks'
import { useAgent, ToolProvider } from '../../../context'
import ConfirmRender from './confirm'

import './index.scss'

interface Props {
  toolCall: ShuttleAi.Tool.Call
}

export default function ToolRender({ toolCall }: Props) {
  const agent = useAgent()
  const message = useToolMessage(agent, toolCall.id)

  const toolDefine = useMemo(() => {
    return agent.options.tools?.find((tool) => tool.name === toolCall.name)
  }, [agent, toolCall.name])

  if (!message) {
    return null
  }

  return (
    <div className="agent-work-agent-tool">
      {toolDefine?.run.type !== 'render' ? (
        <div className="agent-work-agent-fn-tool">
          <p className="fn-tool-name">{toolCall.name}</p>
          <pre className="fn-tool-args">{formatJson(toolCall.args)}</pre>
          <pre className="fn-tool-result">
            {formatJson(message.content || message.confirm?.result)}
          </pre>
          <ConfirmRender
            result={message.confirm}
            toolId={toolCall.id}
            agent={agent}
          />
        </div>
      ) : (
        <ToolProvider
          toolId={toolCall.id}
          agent={agent}
          args={toolCall.args}
          content={message.content}
          confirmResult={message.confirm}
          run={toolDefine.run}
        />
      )}
    </div>
  )
}

function formatJson(data: any) {
  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2)
  }

  try {
    return JSON.stringify(JSON.parse(data), null, 2)
  } catch (error) {
    return data
  }
}
