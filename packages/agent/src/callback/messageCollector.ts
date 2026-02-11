import {
  BaseCallbackHandler,
  NewTokenIndices,
} from '@langchain/core/callbacks/base'
import { LLMResult } from '@langchain/core/outputs'
import { AIMessage, ToolMessage } from 'langchain'
import { randomUUID } from 'crypto'

import { AgentCluster } from '../cluster'

interface Options {
  agentCluster: AgentCluster
  agentId: string
  parentAgentId?: string
}

export default class MessageCollector extends BaseCallbackHandler {
  readonly name = 'messageCollector'

  constructor(readonly options: Options) {
    super()
  }

  handleLLMNewToken(token: string, idx: NewTokenIndices, runId: string) {
    if (!token) return

    this.options.agentCluster.options.hooks.onChunk?.({
      role: 'assistant_chunk',
      content: token,
      id: runId,
      agentId: this.options.agentId,
      workId: this.options.agentCluster.id,
      parentAgentId: this.options.parentAgentId,
    })
  }

  handleLLMEnd(output: LLMResult, runId: string) {
    const message: AIMessage = (output.generations[0][0] as any).message
    const toolCalls = message.tool_calls
      ?.filter((call) => call.name !== AgentCluster.CALL_SUB_AGENT_NAME)
      ?.map((call) => ({
        id: call.id || randomUUID(),
        name: call.name,
        args: call.args,
      }))
    const subAgentIds = message.tool_calls
      ?.filter((call) => call.name === AgentCluster.CALL_SUB_AGENT_NAME)
      ?.map((call) => call.id || randomUUID())

    this.options.agentCluster.addMessage({
      role: 'assistant',
      content: message.content as string,
      toolCalls: toolCalls,
      id: runId,
      subAgentIds,
      agentId: this.options.agentId,
      workId: this.options.agentCluster.id,
      parentAgentId: this.options.parentAgentId,
    })
  }

  handleToolEnd(output: ToolMessage) {
    // 调用子代理的工具，不记录
    if (output.name === AgentCluster.CALL_SUB_AGENT_NAME) return

    const lastAiMessage = this.options.agentCluster.getLastAiMessage(
      this.options.agentId,
    )
    const toolCall = lastAiMessage?.toolCalls?.find(
      (call) => call.id === output.tool_call_id,
    )

    this.options.agentCluster.addMessage({
      role: 'tool',
      name: output.name || '',
      content: output.content as string,
      id: output.tool_call_id || randomUUID(),
      aiMessageId: lastAiMessage && toolCall ? lastAiMessage.id : '',
      agentId: this.options.agentId,
      workId: this.options.agentCluster.id,
      parentAgentId: this.options.parentAgentId,
    })
  }
}
