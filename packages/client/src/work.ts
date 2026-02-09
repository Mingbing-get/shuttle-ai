import { ShuttleAi } from '@shuttle-ai/type'

export default class Work {
  private id: string = ''
  private status: ShuttleAi.Client.Work.Status = 'idle'

  constructor(private options: ShuttleAi.Client.Work.Options) {
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
      } else if (data.type === 'initAgent') {
        this.reportInitAgent(data.data)
      } else if (data.type === 'subAgentStart') {
        data.data.parentAgentId
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

  private reportInitAgent(data: ShuttleAi.Ask.InitAgent['data']) {
    const reportData: ShuttleAi.Report.InitAgent = {
      type: 'initAgent',
      workId: this.id,
      data: {
        id: data.id,
        params: {},
      },
    }

    if (typeof this.options.initAgent === 'function') {
      reportData.data.params = this.options.initAgent(data.id)
    } else if (this.options.initAgent) {
      reportData.data.params = this.options.initAgent[data.id] || {}
    }

    return this.options.transporter.report(reportData)
  }
}
