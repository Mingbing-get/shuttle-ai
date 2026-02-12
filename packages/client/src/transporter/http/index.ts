import { ShuttleAi } from '@shuttle-ai/type'
import BaseHttpTransporter from './base'

export default class HttpTransporter
  extends BaseHttpTransporter
  implements ShuttleAi.Client.Transporter
{
  constructor(private options?: ShuttleAi.Client.HttpTransporterOptions) {
    super(options)
  }

  async *invoke(data: ShuttleAi.Client.StartWork) {
    let path = this.options?.invoke?.path || '/invoke'
    if (!path.startsWith('/')) {
      path = `/${path}`
    }

    const method = 'POST'
    const body = (await this.options?.invoke?.beforeSend?.(data)) || data
    const response = await fetch(`${this.options?.baseUrl || ''}${path}`, {
      method,
      headers: this.options?.requestHeaders as Record<string, string>,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error('Failed to start work')
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Failed to get reader')
    }

    const decoder = new TextDecoder('utf-8')

    while (true) {
      try {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        const chunk = decoder.decode(value)

        const data = this.mergeChunkContent(this.parseJsonStream(chunk))
        for (const item of data) {
          yield item
        }
      } catch (error) {
        break
      }
    }
  }

  private parseJsonStream(jsonStr: string) {
    const result: ShuttleAi.Ask.Define[] = []

    const list = jsonStr.split('\n\n').filter(Boolean)
    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      try {
        result.push(JSON.parse(item))
      } catch (error) {
        if (i + 1 < list.length) {
          list[i + 1] = item + list[i + 1]
        }
      }
    }

    return result
  }

  private mergeChunkContent(messages: ShuttleAi.Ask.Define[]) {
    let lastContent: ShuttleAi.Ask.Chunk | undefined = undefined

    return messages.reduce((total: ShuttleAi.Ask.Define[], item) => {
      if (item.type === 'chunk') {
        if (!lastContent || lastContent.data.chunk.id !== item.data.chunk.id) {
          lastContent = item
          total.push(item)
        } else {
          lastContent.data.chunk.content += item.data.chunk.content
        }
      } else {
        total.push(item)
      }

      return total
    }, [])
  }

  async report(data: ShuttleAi.Report.Define) {
    await this.request(this.options?.report, data, {
      defaultPath: '/report',
    })
  }

  async revokeMessage(data: { workId: string; agentId: string }) {
    return await this.request(this.options?.revokeMessage, data, {
      defaultPath: '/revokeMessage',
    })
  }
}
