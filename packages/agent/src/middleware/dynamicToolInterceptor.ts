import { createMiddleware } from 'langchain'
import { DynamicTool, DynamicStructuredTool, tool } from '@langchain/core/tools'
import {
  AIMessageChunk,
  AIMessage,
  ToolMessage,
} from '@langchain/core/messages'
import { ShuttleAi } from '@shuttle-ai/type'
import { z } from 'zod'

import AgentCluster from '../cluster/instance'

const CHECK_LAZY_TOOL_PARAMS_ERROR_TYPE = 'check_lazy_tool_params_error'

const dynamicToolInterceptorMiddleware = createMiddleware({
  name: 'dynamicToolInterceptorMiddleware',

  beforeModel(state, runtime) {
    const lastMessage = state.messages[state.messages.length - 1]
    if (!lastMessage || !(lastMessage instanceof ToolMessage)) {
      return
    }

    // 将获取这个工具参数的定义和调用获取工具的AI消息从历史消息中移除
    for (let i = state.messages.length - 2; i >= 1; i--) {
      const message = state.messages[i]
      if (!(message instanceof ToolMessage)) continue

      const beforeMessage = state.messages[i - 1]
      if (
        !(beforeMessage instanceof AIMessage) &&
        !(beforeMessage instanceof AIMessageChunk)
      ) {
        continue
      }

      const beforeMessageTool = beforeMessage.tool_calls?.[0]
      if (
        !beforeMessageTool ||
        beforeMessageTool.name !== AgentCluster.GET_TOOL_PARAMS_NAME
      ) {
        continue
      }

      if (beforeMessageTool.args?.toolName !== lastMessage.name) continue

      state.messages.splice(i - 1, 2)
      return
    }

    // 检查前一轮对话是否是检查参数失败的情况，若是则移除前一轮消息
    const beforeMessage = state.messages[state.messages.length - 3]
    if (!beforeMessage || !(beforeMessage instanceof ToolMessage)) {
      return
    }

    const beforeAiMessage = state.messages[state.messages.length - 4]
    if (
      !(beforeAiMessage instanceof AIMessage) &&
      !(beforeAiMessage instanceof AIMessageChunk)
    ) {
      return
    }

    const beforeAiMessageCall = beforeAiMessage.tool_calls?.[0]
    if (beforeAiMessageCall?.name !== lastMessage.name) {
      return
    }

    try {
      const beforeMessageContent = JSON.parse(beforeMessage.content as string)
      if (beforeMessageContent.type !== CHECK_LAZY_TOOL_PARAMS_ERROR_TYPE) {
        return
      }

      state.messages.splice(state.messages.length - 4, 2)
    } catch (error) {}
  },

  wrapToolCall: async (request, handle) => {
    const context = request.runtime.context as ShuttleAi.Cluster.Context

    // 处理大模型错误直接调用懒加载工具的问题
    if (!request.tool) {
      const lazyTool = context._agentCluster.getLazyToolByToolName(
        request.toolCall.name,
      )
      if (lazyTool) {
        if (
          lazyTool instanceof DynamicTool ||
          lazyTool instanceof DynamicStructuredTool
        ) {
          request.tool = lazyTool
        } else {
          request.tool = tool(() => '', {
            schema: lazyTool.schema as any,
            name: request.toolCall.name,
            extras: (lazyTool as any)?.extras,
          })
        }

        try {
          const argSchema =
            request.tool.schema instanceof z.ZodType
              ? request.tool.schema
              : z.fromJSONSchema(request.tool.schema as any)

          const res = argSchema.safeParse(request.toolCall.args)
          if (!res.success) {
            return new ToolMessage({
              name: request.toolCall.name,
              content: JSON.stringify({
                type: CHECK_LAZY_TOOL_PARAMS_ERROR_TYPE,
                message: `参数校验失败：${res.error.message}\n参数定义如下\n${JSON.stringify(argSchema.toJSONSchema())}`,
              }),
              tool_call_id: request.toolCall.id || '',
            })
          }
        } catch (error) {
          return new ToolMessage({
            name: request.toolCall.name,
            content: `${request.toolCall.name}是懒加载工具，请严格按照懒加载工具的方式来调用`,
            tool_call_id: request.toolCall.id || '',
          })
        }
      }
    }

    if (request.toolCall.name === AgentCluster.CALL_LAZY_TOOL_NAME) {
      const lazyTool = context._agentCluster.getLazyTool(
        request.toolCall.args.agentName,
        request.toolCall.args.toolName,
      )
      request.toolCall = {
        ...request.toolCall,
        name: request.toolCall.args.toolName,
        args: request.toolCall.args.args,
      }
      if (
        lazyTool instanceof DynamicTool ||
        lazyTool instanceof DynamicStructuredTool
      ) {
        request.tool = lazyTool
      } else {
        request.tool = tool(() => '', {
          name: request.toolCall.name,
          extras: (lazyTool as any)?.extras,
        })
      }

      const lastMessage = request.state.messages[
        request.state.messages.length - 1
      ] as AIMessageChunk
      const stateTool = lastMessage.tool_calls?.find(
        (tool) => tool.id === request.toolCall.id,
      )
      if (stateTool) {
        stateTool.args = request.toolCall.args
        stateTool.name = request.toolCall.name
      }
    }

    const reportToolMessage: ShuttleAi.Message.Tool = {
      role: 'tool',
      name: request.toolCall.name,
      id: request.toolCall.id || '',
      aiMessageId: '',
      agentId: context._agentId,
      workId: context._agentCluster.id,
    }
    let toolMessage: UnpackPromise<ReturnType<typeof handle>> | undefined
    let isError = false

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
            name: request.toolCall.name,
            content: res.reason || 'can not run tool',
            tool_call_id: request.toolCall.id || '',
          })
        }

        if (res.type === 'confirmWithResult') {
          context._agentCluster.addMessage(reportToolMessage)
          return new ToolMessage({
            name: request.toolCall.name,
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
            context._agentCluster.options.hooks.onToolEnd?.(toolPath, {
              type: 'success',
              content: toolMessage.content as string,
            })
          } else {
            context._agentCluster.options.hooks.onToolEnd?.(toolPath, {
              type: 'success',
              content: '{}',
            })
          }
        } catch (error) {
          toolMessage = new ToolMessage({
            name: request.toolCall.name,
            content: (error as Error).message || 'can not run tool',
            tool_call_id: request.toolCall.id || '',
          })
          isError = true
          context._agentCluster.options.hooks.onToolEnd?.(toolPath, {
            type: 'fail',
            reason: toolMessage.content as string,
          })
        }
      }
    }

    if (!toolMessage) {
      try {
        toolMessage = await handle(request)
      } catch (error) {
        isError = true
        toolMessage = new ToolMessage({
          name: request.toolCall.name,
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
      ![
        AgentCluster.CALL_SUB_AGENT_NAME,
        AgentCluster.GET_TOOL_PARAMS_NAME,
      ].includes(toolMessage.name || '')
    ) {
      reportToolMessage.result = isError
        ? {
            type: 'fail',
            reason: toolMessage.content as string,
          }
        : {
            type: 'success',
            content: toolMessage.content as string,
          }
      context._agentCluster.addMessage(reportToolMessage)
    }

    return toolMessage!
  },
})

export function checkAutoRunTool(
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
