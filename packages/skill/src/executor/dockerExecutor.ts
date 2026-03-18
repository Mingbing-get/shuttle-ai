import { readFile } from 'fs/promises'
import Docker from 'dockerode'

export default class DockerExecutor {
  protected docker: Docker

  constructor() {
    this.docker = new Docker()
  }

  protected async checkIfRunningInDocker(): Promise<boolean> {
    try {
      await readFile('/.dockerenv')
      return true
    } catch {
      return false
    }
  }

  protected async getCurrentContainerId(): Promise<string> {
    const fromMountinfoId = await this.getContainerIdFromMountinfo()
    if (fromMountinfoId) {
      return fromMountinfoId
    }

    const fromCgroupId = await this.getContainerIdFromCgroup()
    if (fromCgroupId) {
      return fromCgroupId
    }

    const fromHostnameId = await this.getContainerIdFromHostname()
    if (fromHostnameId) {
      return fromHostnameId
    }

    return ''
  }

  private async getContainerIdFromHostname() {
    try {
      const content = await readFile('/etc/hostname', 'utf8')
      return content.trim()
    } catch (error) {
      return ''
    }
  }

  private async getContainerIdFromCgroup() {
    try {
      const content = await readFile('/proc/self/cgroup', 'utf8')
      return (
        content
          .split('\n')
          .find((line) => line.includes('docker'))
          ?.split('/')
          ?.pop() || ''
      )
    } catch {
      return ''
    }
  }

  private async getContainerIdFromMountinfo() {
    try {
      const content = await readFile('/proc/self/mountinfo', 'utf8')
      return (
        content
          .split('\n')
          .find((line) => line.includes('/docker/containers/'))
          ?.split('/')?.[3] || ''
      )
    } catch {
      return ''
    }
  }

  protected async pullImage(imageName: string): Promise<void> {
    try {
      await this.docker.getImage(imageName).inspect()
    } catch (error) {
      await new Promise<void>((resolve, reject) => {
        this.docker.pull(
          imageName,
          (err: Error | null, stream: NodeJS.ReadableStream) => {
            if (err) {
              reject(err)
              return
            }

            this.docker.modem.followProgress(stream, (err: Error | null) => {
              if (err) {
                reject(err)
              } else {
                resolve()
              }
            })
          },
        )
      })
    }
  }
}
