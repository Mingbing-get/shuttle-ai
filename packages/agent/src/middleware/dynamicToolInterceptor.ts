import { createMiddleware } from 'langchain'
import { DynamicTool, DynamicStructuredTool } from '@langchain/core/tools'
import { AIMessageChunk, ToolMessage } from '@langchain/core/messages'
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

    if (
      request.tool instanceof DynamicTool ||
      request.tool instanceof DynamicStructuredTool
    ) {
      const extras = (request.tool.extras as ShuttleAi.Tool.Extras) || {}
      if (!extras.skipReport) {
        const needConfirm = !checkAutoRunTool(extras, context._agentCluster)

        const aiMessage = context._agentCluster.getLastAiMessage(
          context._agentId,
        )

        const toolCall = aiMessage?.toolCalls?.find(
          (toolCall) => toolCall.id === request.toolCall.id,
        )

        const res = await context._agentCluster.options.hooks.onToolStart({
          role: 'assistant_tool',
          toolCall: toolCall as any,
          needConfirm: extras.remote || needConfirm,
          id: aiMessage?.id || '',
          agentId: context._agentId,
          workId: context._agentCluster.id,
          parentAgentId: context._parentAgentId,
        })

        if (
          res.type === 'reject' ||
          (res.type === 'confirm' && extras.remote)
        ) {
          return new ToolMessage({
            content: res.reason || 'can not run tool',
            tool_call_id: request.toolCall.id || '',
          })
        }

        if (res.type === 'confirmWithResult') {
          return new ToolMessage({
            content:
              typeof res.result === 'object'
                ? JSON.stringify(res.result)
                : res.result || 'success',
            tool_call_id: request.toolCall.id || '',
          })
        }

        const toolPath: ShuttleAi.Tool.Path = {
          agentId: context._agentId,
          messageId: aiMessage?.id || '',
          toolId: request.toolCall.id || '',
        }

        if (res.newArgs) {
          request.toolCall.args = res.newArgs
          const lastMessage = request.state.messages[
            request.state.messages.length - 1
          ] as AIMessageChunk
          const tool = lastMessage.tool_calls?.find(
            (tool) => tool.id === request.toolCall.id,
          )
          if (tool) {
            tool.args = res.newArgs
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
