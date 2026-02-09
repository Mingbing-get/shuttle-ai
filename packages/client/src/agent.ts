import { ShuttleAi } from '@shuttle-ai/type'

export default class Agent {
  private _children: Agent[] = []

  constructor(readonly options: ShuttleAi.Client.Agent.Options) {}

  addChild(agent: Agent) {
    this._children.push(agent)
  }

  get children() {
    return this._children
  }
}
