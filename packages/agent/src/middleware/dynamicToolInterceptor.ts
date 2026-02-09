import { createMiddleware } from 'langchain'
import { DynamicTool } from '@langchain/core/tools'
import { ToolMessage } from '@langchain/core/messages'
import { ShuttleAi } from '@shuttle-ai/type'

import AgentCluster from '../cluster/instance'

const dynamicToolInterceptorMiddleware = createMiddleware({
  name: 'dynamicToolInterceptorMiddleware',
  wrapToolCall: async (request, handle) => {
    const context = request.runtime.context as {
      _agentCluster: AgentCluster
      _agentId: string
      _parentAgentId?: string
    }

    if (request.tool instanceof DynamicTool) {
      const extras = (request.tool.extras as ShuttleAi.Tool.Extras) || {}
      if (!extras.skipReport) {
        const aiMessage = context._agentCluster.getLastAiMessage(
          context._agentId,
        )

        const toolCall = aiMessage?.toolCalls?.find(
          (toolCall) => toolCall.id === request.toolCall.id,
        )

        context._agentCluster.options.hooks.onToolStart?.({
          role: 'assistant_tool',
          toolCall: toolCall as any,
          id: aiMessage?.id || '',
          agentId: context._agentId,
          workId: context._agentCluster.id,
          parentAgentId: context._parentAgentId,
        })

        const toolPath: ShuttleAi.Tool.Path = {
          agentId: context._agentId,
          messageId: aiMessage?.id || '',
          toolId: request.toolCall.id || '',
        }

        // 判断是否需要确认
        if (!checkAutoRunTool(extras, context._agentCluster)) {
          const onToolConfirm =
            context._agentCluster.options.hooks.onToolConfirm
          if (!onToolConfirm) {
            return new ToolMessage({
              content: 'can not run tool',
              tool_call_id: request.toolCall.id || '',
            })
          }

          const res = await onToolConfirm(toolPath)
          if (res.type === 'reject') {
            return new ToolMessage({
              content: res.reason || 'can not run tool',
              tool_call_id: request.toolCall.id || '',
            })
          }

          if (res.type === 'confirmWithResult') {
            return new ToolMessage({
              content: res.result || 'success',
              tool_call_id: request.toolCall.id || '',
            })
          }
        }

        const toolMessage = await handle(request)
        if (toolMessage instanceof ToolMessage) {
          context._agentCluster.options.hooks.onToolEnd?.(
            toolPath,
            toolMessage.content,
          )
        } else {
          context._agentCluster.options.hooks.onToolEnd?.(toolPath, '{}')
        }

        return toolMessage
      }
    }

    return handle(request)
  },
})

function checkAutoRunTool(
  extras: ShuttleAi.Tool.Extras,
  agentCluster: AgentCluster,
) {
  if (extras.scope === 'autoRun') return true

  if (agentCluster.options.autoRunScope === 'always') {
    return true
  }

  if (
    agentCluster.options.autoRunScope === 'read' &&
    extras.scope !== 'write'
  ) {
    return true
  }

  return false
}

export default dynamicToolInterceptorMiddleware
