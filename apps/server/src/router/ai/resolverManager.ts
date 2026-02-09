import { ShuttleAi } from '@shuttle-ai/type'

interface AgentResolver {
  resolveConfirmTool: (id: string, value: ShuttleAi.Tool.ConfirmResult) => void
  resolveRemoteTool: (id: string, value: any) => void
  resolveAgentStart: (
    id: string,
    value: ShuttleAi.Report.AgentStart['data']['params'],
  ) => void
}

class ResolverManager {
  private agentResolver: Record<string, AgentResolver> = {}

  addAgentResolver(agentId: string, resolver: AgentResolver) {
    this.agentResolver[agentId] = resolver
  }

  removeAgentResolver(agentId: string) {
    delete this.agentResolver[agentId]
  }

  getAgentResolve(agentId: string) {
    return this.agentResolver[agentId]
  }
}

export default new ResolverManager()
