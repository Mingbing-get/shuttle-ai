import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import { LLMResult } from '@langchain/core/outputs'
import { ShuttleAi } from '@shuttle-ai/type'

export default class TokenCollector extends BaseCallbackHandler {
  readonly name = 'TokenCollector'

  private tokenUseage: ShuttleAi.Cluster.TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  }

  constructor() {
    super()
  }

  handleLLMEnd(output: LLMResult, runId: string) {
    const tokenUseage: ShuttleAi.Cluster.TokenUsage = output.llmOutput
      ?.tokenUsage || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    }

    this.tokenUseage.promptTokens += tokenUseage.promptTokens
    this.tokenUseage.completionTokens += tokenUseage.completionTokens
    this.tokenUseage.totalTokens += tokenUseage.totalTokens
  }

  getTokenUseage() {
    return this.tokenUseage
  }
}
