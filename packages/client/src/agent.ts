import { ShuttleAi } from '@shuttle-ai/type'

export default class Agent {
  private _children: Agent[] = []
  private _messages: ShuttleAi.Message.Define[] = []
  private _status: ShuttleAi.Client.Agent.Status = 'idle'

  private listener: {
    [k in keyof ShuttleAi.Client.Agent.EventMap]: ((
      data: ShuttleAi.Client.Agent.EventMap[k],
    ) => void)[]
  } = {
    status: [],
    messages: [],
    aiMessage: [],
    toolMessage: [],
    subAgents: [],
  }

  constructor(readonly options: ShuttleAi.Client.Agent.Options) {
    this._messages = [...(options.history || [])]
    this._status = options.status || 'idle'
  }

  addChild(agent: Agent, belongMessageId: string) {
    this._children.push(agent)
    this.trigger('subAgents', undefined)

    const aiMessage = this.findAiMessageById(belongMessageId)
    if (!aiMessage) return

    aiMessage.subAgentIds = [...(aiMessage.subAgentIds || []), agent.options.id]
    this.trigger('aiMessage', aiMessage)
  }

  run() {
    this._status = 'running'
    this.trigger('status', this._status)
  }

  end() {
    this._status = 'idle'
    this.trigger('status', this._status)
  }

  addChunk(chunk: ShuttleAi.Message.AIChunk) {
    const lastMessage = this._messages[this._messages.length - 1]
    if (lastMessage.role === 'assistant' && lastMessage.id === chunk.id) {
      lastMessage.content += chunk.content
      this.trigger('aiMessage', lastMessage)
    } else {
      this._messages.push({
        role: 'assistant',
        content: chunk.content,
        id: chunk.id,
        agentId: this.options.id,
        workId: this.options.work.id,
        parentAgentId: this.options.parentId,
      })
      this.trigger('messages', this._messages)
    }
  }

  addToolCall(aiTool: ShuttleAi.Message.AITool) {
    const aiMessage = this.findAiMessageById(aiTool.id)
    if (!aiMessage) return

    aiMessage.toolCalls = [...(aiMessage.toolCalls || []), aiTool.toolCall]
    this._messages.push({
      role: 'tool',
      name: aiTool.toolCall.name,
      id: aiTool.toolCall.id,
      aiMessageId: aiTool.id,
      agentId: this.options.id,
      workId: this.options.work.id,
      parentAgentId: this.options.parentId,
      confirm: aiTool.needConfirm
        ? undefined
        : {
            type: 'confirm',
          },
    })
    this.trigger('aiMessage', aiMessage)
    this.trigger('messages', this._messages)
  }

  endTool(info: ShuttleAi.Ask.ToolEnd['data']) {
    const toolMessage = this.findToolMessageById(info.toolPath.toolId)
    if (!toolMessage) return

    toolMessage.content = info.toolResult
    this.trigger('toolMessage', toolMessage)
  }

  async confirmTool(
    toolId: string,
    confirmResult: ShuttleAi.Tool.ConfirmResult,
  ) {
    const toolMessage = this.findToolMessageById(toolId)
    if (!toolMessage) return

    const aiMessage = this.findAiMessageById(toolMessage.aiMessageId)
    if (!aiMessage) return

    if (confirmResult.type !== 'reject') {
      const toolDefine = this.options.tools?.find(
        (tool) => tool.name === toolMessage.name,
      )
      if (toolDefine?.run.type === 'fn') {
        const toolCall = aiMessage.toolCalls?.find(
          (call) => call.id === toolMessage.id,
        )

        confirmResult.result = await this.runTool(toolDefine.run.fn, toolCall)
        confirmResult.type = 'confirmWithResult'
      }
    }

    await this.options.work.options.transporter.report({
      type: 'toolConfirm',
      workId: this.options.work.id,
      data: {
        toolId,
        result: confirmResult,
      },
    })

    toolMessage.confirm = confirmResult
    this.trigger('toolMessage', toolMessage)
  }

  findToolMessageById(toolId: string) {
    let toolMessage: ShuttleAi.Message.Tool | undefined
    for (let i = this._messages.length - 1; i >= 0; i--) {
      const message = this._messages[i]
      if (message.role === 'tool' && message.id === toolId) {
        toolMessage = message
        break
      }
    }

    return toolMessage
  }

  findAiMessageById(aiId: string) {
    let aiMessage: ShuttleAi.Message.AI | undefined
    for (let i = this._messages.length - 1; i >= 0; i--) {
      const message = this._messages[i]
      if (message.role === 'assistant' && message.id === aiId) {
        aiMessage = message
        break
      }
    }

    return aiMessage
  }

  private async runTool(
    fn: (args: any) => Promise<any>,
    toolCall?: ShuttleAi.Tool.Call,
  ) {
    if (!toolCall) {
      return {
        status: 'error',
        message: 'toolCall is required',
      }
    }

    try {
      return await fn(toolCall.args || {})
    } catch (error) {
      return {
        status: 'error',
        message: (error as Error).message,
      }
    }
  }

  private trigger<K extends keyof ShuttleAi.Client.Agent.EventMap>(
    type: K,
    data: ShuttleAi.Client.Agent.EventMap[K],
  ) {
    this.listener[type].forEach((item) => item(data))
  }

  on<K extends keyof ShuttleAi.Client.Agent.EventMap>(
    type: K,
    cb: (data: ShuttleAi.Client.Agent.EventMap[K]) => void,
  ) {
    this.listener[type].push(cb)

    return () => {
      ;(this.listener as any)[type] = this.listener[type].filter(
        (item) => item !== cb,
      )
    }
  }

  get children() {
    return this._children
  }

  get messages() {
    return this._messages
  }

  get status() {
    return this._status
  }
}
