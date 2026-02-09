import { ShuttleAi } from '@shuttle-ai/type'
import Agent from './agent'

export default class Work {
  private id: string = ''
  private status: ShuttleAi.Client.Work.Status = 'idle'

  private agentMap: Map<string, Agent> = new Map()

  constructor(readonly options: ShuttleAi.Client.Work.Options) {
    this.linkTransporter()
  }

  private linkTransporter() {
    this.options.transporter.on((data) => {
      console.log(data)
      if (data.type === 'startWork') {
        this.id = data.data.workId
        this.setStatus('running')
      } else if (data.type === 'endWork') {
        this.setStatus('completed')
      } else if (data.type === 'agentStart') {
        this.initAgent(data.data)
      }
    })
  }

  on(cb: (data: ShuttleAi.Ask.Define) => void) {
    return this.options.transporter.on(cb)
  }

  getId() {
    return this.id
  }

  getStatus() {
    return this.status
  }

  invoke(prompt: string) {
    this.setStatus('pending')
    return this.options.transporter.invoke({ prompt })
  }

  private setStatus(status: ShuttleAi.Client.Work.Status) {
    this.status = status
  }

  private addAgent(agent: Agent) {
    if (agent.options.parentId) {
      const parentAgent = this.agentMap.get(agent.options.parentId)
      if (parentAgent) {
        parentAgent.addChild(agent)
      }
    }
    this.agentMap.set(agent.options.id, agent)
  }

  private initAgent(data: ShuttleAi.Ask.AgentStart['data']) {
    const reportData: ShuttleAi.Report.AgentStart = {
      type: 'agentStart',
      workId: this.id,
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
      parentId: data.parentAgentId,
      tools: params.tools,
    })
    this.addAgent(agent)

    return this.options.transporter.report(reportData)
  }
}
