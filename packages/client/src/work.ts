import { ShuttleAi } from '@shuttle-ai/type'
import Agent from './agent'

type ListenerType = 'autoRunScope' | 'status' | 'agent'

export default class Work {
  static MAIN_AGENT_NAME = 'main_agent'
  static CALL_SUB_AGENT_NAME = 'call_sub_agent'

  private _id: string = ''
  private _status: ShuttleAi.Client.Work.Status = 'idle'
  private _autoRunScope: ShuttleAi.Client.Work.AutoRunScope = 'none'

  private agentMap: Map<string, Agent> = new Map()
  private listenerMap: Record<ListenerType, (() => void)[]> = {
    autoRunScope: [],
    status: [],
    agent: [],
  }

  constructor(readonly options: ShuttleAi.Client.Work.Options) {
    this._autoRunScope = options.autoRunScope || 'none'
  }

  get id() {
    return this._id
  }

  get status() {
    return this._status
  }

  get autoRunScope() {
    return this._autoRunScope
  }

  setAutoRunScope(scope: ShuttleAi.Client.Work.AutoRunScope) {
    this._autoRunScope = scope
    this.trigger('autoRunScope')
  }

  async invoke(prompt: string) {
    this.setStatus('pending')

    const generator = this.options.transporter.invoke({
      prompt,
      autoRunScope: this._autoRunScope,
      workId: this._id,
    })

    for await (const data of generator) {
      if (data.type === 'startWork') {
        this._id = data.data.workId
        this.setStatus('running')
      } else if (data.type === 'endWork') {
        this.setStatus('idle')
      } else if (data.type === 'agentStart') {
        await this.initAgent(data.data)
      } else if (data.type === 'agentEnd') {
        const agent = this.agentMap.get(data.data.agentId)
        agent?.end()
      } else if (data.type === 'chunk') {
        const agent = this.agentMap.get(data.data.chunk.agentId)
        agent?.addChunk(data.data.chunk)
      } else if (data.type === 'toolStart') {
        const agent = this.agentMap.get(data.data.tool.agentId)
        agent?.addToolCall(data.data.tool)
      } else if (data.type === 'toolEnd') {
        const agent = this.agentMap.get(data.data.toolPath.agentId)
        agent?.endTool(data.data)
      }
    }
  }

  async revoke(workId: string) {
    this._id = workId
    this.agentMap.clear()

    await this.revokeAgent(workId, Work.MAIN_AGENT_NAME)
  }

  async revokeAgent(agentId: string, agentName: string) {
    const messages = await this.options.transporter.revokeMessage({
      workId: this._id,
      agentId,
    })

    const currentAgentMessages = messages.filter(
      (message) => message.agentId === agentId,
    )

    let currentAgent = this.agentMap.get(agentId)
    if (!currentAgent) {
      const currentAgentParams = await this.getAgentParams(agentName)
      currentAgent = new Agent({
        id: agentId,
        name: agentName,
        work: this,
        history: currentAgentMessages,
        status: 'idle',
        tools: currentAgentParams.tools,
      })
      this.agentMap.set(agentId, currentAgent)
    } else {
      currentAgent.revokeMessages(currentAgentMessages)
    }

    for (const message of messages) {
      if (message.role !== 'assistant' || !message.subAgents?.length) {
        continue
      }

      for (const subAgent of message.subAgents) {
        const subAgentParams = await this.getAgentParams(subAgent.name)
        const subAgentInstance = new Agent({
          id: subAgent.id,
          name: subAgent.name,
          work: this,
          history: messages.filter((msg) => msg.agentId === subAgent.id),
          status: 'waitRevoke',
          tools: subAgentParams.tools,
        })
        this.agentMap.set(subAgent.id, subAgentInstance)
        currentAgent.addChild(subAgentInstance, message.id)
      }
    }

    this.trigger('agent')
  }

  on(type: ListenerType, cb: () => void) {
    const listeners = this.listenerMap[type]
    listeners.push(cb)

    return () => {
      const index = listeners.indexOf(cb)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
  }

  getAgent(id: string) {
    return this.agentMap.get(id)
  }

  getRootAgent() {
    return this.agentMap.get(this._id)
  }

  private trigger(type: ListenerType) {
    const listeners = this.listenerMap[type]
    listeners.forEach((cb) => cb())
  }

  private setStatus(status: ShuttleAi.Client.Work.Status) {
    this._status = status
    this.trigger('status')
  }

  private addAgent(agent: Agent, belongMessageId?: string) {
    if (agent.options.parentId && belongMessageId) {
      const parentAgent = this.agentMap.get(agent.options.parentId)
      if (parentAgent) {
        parentAgent.addChild(agent, belongMessageId)
      }
    }
    this.agentMap.set(agent.options.id, agent)
    this.trigger('agent')
  }

  private async initAgent(data: ShuttleAi.Ask.AgentStart['data']) {
    const reportData: ShuttleAi.Report.AgentStart = {
      type: 'agentStart',
      workId: this._id,
      data: {
        agentId: data.agentId,
        params: {},
      },
    }

    const params = await this.getAgentParams(data.agentName)

    reportData.data.params = {
      ...params,
      tools: params.tools
        ?.filter((tool) => !tool.extras?.disableExport)
        ?.map((tool) => {
          const { run, ...rest } = tool

          return rest
        }),
    }

    const currentUserMessage: ShuttleAi.Message.User = {
      role: 'user',
      content: data.content,
      id: new Date().toISOString(),
      agentId: data.agentId,
      workId: this._id,
    }
    const agent = this.agentMap.get(data.agentId)
    if (!agent) {
      const agent = new Agent({
        id: data.agentId,
        name: data.agentName,
        work: this,
        history: [currentUserMessage],
        status: 'running',
        parentId: data.parentAgentId,
        tools: params.tools,
      })
      this.addAgent(agent, data.beloneMessageId)
    } else {
      agent.addMessage(currentUserMessage)
    }

    return this.options.transporter.report(reportData)
  }

  private async getAgentParams(agentName: string) {
    if (typeof this.options.initAgent === 'function') {
      return await this.options.initAgent(agentName)
    } else if (this.options.initAgent) {
      return this.options.initAgent[agentName] || {}
    }
    return {}
  }
}
