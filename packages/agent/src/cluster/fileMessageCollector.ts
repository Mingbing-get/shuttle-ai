import { ShuttleAi } from '@shuttle-ai/type'
import path from 'path'
import fs from 'fs/promises'

export default class FileMessageCollector
  implements ShuttleAi.Cluster.MessageCollector
{
  constructor(private readonly dirPath: string) {}

  async saveMessage(message: ShuttleAi.Message.Define) {
    const messages = await this.getMessagesByAgentId(
      message.workId,
      message.agentId,
    )

    const filePath = path.join(
      this.dirPath,
      `${message.workId}`,
      `${message.agentId}.json`,
    )
    messages.push(message)

    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(messages, null, 2))
  }

  async getMessagesByAgentId(
    workId: string,
    agentId: string,
  ): Promise<ShuttleAi.Message.Define[]> {
    const filePath = path.join(this.dirPath, `${workId}`, `${agentId}.json`)
    try {
      const data = await fs.readFile(filePath, 'utf8')
      const messages: ShuttleAi.Message.Define[] = JSON.parse(data)

      return messages
    } catch (error) {
      return []
    }
  }

  async getSubAgentTasks(workId: string, subAgentIds: string[]) {
    const taskMessage: ShuttleAi.Message.Define[] = []

    for (const subAgentId of subAgentIds) {
      const messages = await this.getMessagesByAgentId(workId, subAgentId)
      const firstUserMessage = messages.find(
        (message) => message.role === 'user',
      )
      if (firstUserMessage) {
        taskMessage.push(firstUserMessage)
      }
    }

    return taskMessage
  }
}
