import { createMiddleware } from 'langchain'
import { DynamicTool, DynamicStructuredTool } from '@langchain/core/tools'
import { AIMessageChunk, ToolMessage } from '@langchain/core/messages'
import { ShuttleAi } from '@shuttle-ai/type'

import AgentCluster from '../cluster/instance'

const dynamicToolInterceptorMiddleware = createMiddleware({
  name: 'dynamicToolInterceptorMiddleware',
  wrapToolCall: async (request, handle) => {
    const context = request.runtime.context as ShuttleAi.Cluster.Context

    const reportToolMessage: ShuttleAi.Message.Tool = {
      role: 'tool',
      name: request.toolCall.name,
      id: request.toolCall.id || '',
      aiMessageId: '',
      agentId: context._agentId,
      workId: context._agentCluster.id,
    }
    let toolMessage: UnpackPromise<ReturnType<typeof handle>> | undefined

    if (
      request.tool instanceof DynamicTool ||
      request.tool instanceof DynamicStructuredTool ||
      (request.tool && 'extras' in request.tool)
    ) {
      const extras = (request.tool.extras as ShuttleAi.Tool.Extras) || {}
      if (!extras.skipReport) {
        const needConfirm = !checkAutoRunTool(extras, context._agentCluster)

        const aiMessage = context._agentCluster.getLastAiMessage(
          context._agentId,
        )

        reportToolMessage.aiMessageId = aiMessage?.id || ''
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
        })
        reportToolMessage.confirm = res

        if (
          res.type === 'reject' ||
          (res.type === 'confirm' && extras.remote)
        ) {
          context._agentCluster.addMessage(reportToolMessage)
          return new ToolMessage({
            content: res.reason || 'can not run tool',
            tool_call_id: request.toolCall.id || '',
          })
        }

        if (res.type === 'confirmWithResult') {
          context._agentCluster.addMessage(reportToolMessage)
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

        try {
          toolMessage = await handle(request)
          if (toolMessage instanceof ToolMessage || 'content' in toolMessage) {
            context._agentCluster.options.hooks.onToolEnd?.(
              toolPath,
              toolMessage.content,
            )
          } else {
            context._agentCluster.options.hooks.onToolEnd?.(toolPath, '{}')
          }
        } catch (error) {
          toolMessage = new ToolMessage({
            content: (error as Error).message || 'can not run tool',
            tool_call_id: request.toolCall.id || '',
          })
        }
      }
    }

    if (!toolMessage) {
      try {
        toolMessage = await handle(request)
      } catch (error) {
        toolMessage = new ToolMessage({
          content: (error as Error).message || 'can not run tool',
          tool_call_id: request.toolCall.id || '',
        })
      }
    }

    if ('lg_name' in toolMessage && toolMessage.lg_name === 'Command') {
      toolMessage = (toolMessage?.update as any)?.messages?.[0]
    }
    if (
      toolMessage instanceof ToolMessage &&
      toolMessage.name !== AgentCluster.CALL_SUB_AGENT_NAME
    ) {
      reportToolMessage.content = toolMessage.content as string
      context._agentCluster.addMessage(reportToolMessage)
    }

    return toolMessage!
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

type UnpackPromise<T> = T extends Promise<infer U> ? U : T
