import { ShuttleAi } from '@shuttle-ai/type'
import Agent from './agent'

type ListenerType = 'status' | 'agent'

export default class Work {
  private _id: string = ''
  private _status: ShuttleAi.Client.Work.Status = 'idle'

  private agentMap: Map<string, Agent> = new Map()
  private listenerMap: Record<ListenerType, (() => void)[]> = {
    status: [],
    agent: [],
  }

  constructor(readonly options: ShuttleAi.Client.Work.Options) {}

  get id() {
    return this._id
  }

  get status() {
    return this._status
  }

  async invoke(prompt: string) {
    this.setStatus('pending')

    const generator = this.options.transporter.invoke({ prompt })

    for await (const data of generator) {
      if (data.type === 'startWork') {
        this._id = data.data.workId
        this.setStatus('running')
      } else if (data.type === 'endWork') {
        this.setStatus('idle')
      } else if (data.type === 'agentStart') {
        this.initAgent(data.data)
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

  private trigger(type: ListenerType) {
    const listeners = this.listenerMap[type]
    listeners.forEach((cb) => cb())
  }

  private setStatus(status: ShuttleAi.Client.Work.Status) {
    this._status = status
    this.trigger('status')
  }

  private addAgent(agent: Agent) {
    if (agent.options.parentId) {
      const parentAgent = this.agentMap.get(agent.options.parentId)
      if (parentAgent) {
        parentAgent.addChild(agent)
      }
    }
    this.agentMap.set(agent.options.id, agent)
    this.trigger('agent')
  }

  private initAgent(data: ShuttleAi.Ask.AgentStart['data']) {
    const reportData: ShuttleAi.Report.AgentStart = {
      type: 'agentStart',
      workId: this._id,
      data: {
        agentId: data.agentId,
        params: {},
      },
    }

    let params: ShuttleAi.Client.Agent.WithRunToolParams = {}
    if (typeof this.options.initAgent === 'function') {
      params = this.options.initAgent(data.agentName)
    } else if (this.options.initAgent) {
      params = this.options.initAgent[data.agentName] || {}
    }

    reportData.data.params = {
      ...params,
      tools: params.tools?.map((tool) => {
        const { run, ...rest } = tool

        return rest
      }),
    }

    const agent = new Agent({
      id: data.agentId,
      work: this,
      history: [
        {
          role: 'user',
          content: data.content,
          id: '',
          agentId: data.agentId,
          workId: this._id,
          parentAgentId: data.parentAgentId,
        },
      ],
      status: 'running',
      parentId: data.parentAgentId,
      tools: params.tools,
    })
    this.addAgent(agent)

    return this.options.transporter.report(reportData)
  }
}
