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
    const toolCalls = message.tool_calls?.map((call) => ({
      id: call.id || randomUUID(),
      name: call.name,
      args: call.args,
    }))

    this.options.agentCluster.addMessage({
      role: 'assistant',
      content: message.content as string,
      toolCalls: toolCalls,
      id: runId,
      agentId: this.options.agentId,
      workId: this.options.agentCluster.id,
      parentAgentId: this.options.parentAgentId,
    })
  }

  handleToolEnd(output: ToolMessage) {
    this.options.agentCluster.addMessage({
      role: 'tool',
      name: output.name || '',
      content: output.content as string,
      id: output.tool_call_id || randomUUID(),
      agentId: this.options.agentId,
      workId: this.options.agentCluster.id,
      parentAgentId: this.options.parentAgentId,
    })
  }
}
