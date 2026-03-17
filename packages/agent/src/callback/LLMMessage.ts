import {
  BaseCallbackHandler,
  NewTokenIndices,
} from '@langchain/core/callbacks/base'
import { LLMResult } from '@langchain/core/outputs'
import { AIMessage } from 'langchain'
import { randomUUID } from 'crypto'
import { ShuttleAi } from '@shuttle-ai/type'

import { AgentCluster } from '../cluster'

interface Options {
  agentCluster: AgentCluster
  agentId: string
}

export default class LLMMessage extends BaseCallbackHandler {
  readonly name = 'LLMMessage'

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
    })
  }

  handleLLMEnd(output: LLMResult, runId: string) {
    const message: AIMessage = (output.generations[0][0] as any).message
    const tokenUseage: ShuttleAi.Cluster.TokenUsage = output.llmOutput
      ?.tokenUsage || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    }

    this.options.agentCluster.spendToken(tokenUseage)

    // 不保存获取工具参数定义
    if (
      message.tool_calls?.length === 1 &&
      message.tool_calls[0].name === AgentCluster.GET_TOOL_PARAMS_NAME
    ) {
      return
    }

    const toolCalls = message.tool_calls
      ?.filter((call) => call.name !== AgentCluster.CALL_SUB_AGENT_NAME)
      ?.map((call) => {
        if (call.name === AgentCluster.CALL_LAZY_TOOL_NAME) {
          return {
            id: call.id || randomUUID(),
            name: call.args.toolName,
            args: call.args.args,
          }
        }

        return {
          id: call.id || randomUUID(),
          name: call.name,
          args: call.args,
        }
      })
    const subAgents = message.tool_calls
      ?.filter((call) => call.name === AgentCluster.CALL_SUB_AGENT_NAME)
      ?.map((call) => ({
        id: call.id || randomUUID(),
        name: call.args.subAgentName,
      }))

    this.options.agentCluster.addMessage({
      role: 'assistant',
      content: message.content as string,
      toolCalls: toolCalls,
      id: runId,
      subAgents,
      agentId: this.options.agentId,
      workId: this.options.agentCluster.id,
    })
  }
}
