import Docker from 'dockerode'
import { NSkillLoader } from '../loader/type'

export default class BashExecutor implements NSkillLoader.Executor {
  private docker: Docker

  constructor() {
    this.docker = new Docker()
  }

  async execute(options: NSkillLoader.ScriptExecuteOptions): Promise<string> {
    const { skillDir, scriptPath, args, env } = options

    const containerName = `skill-executor-${Date.now()}`
    const workDir = '/workspace'

    const argList = Object.entries(args).map(([key, value]) => {
      const v = typeof value === 'object' ? JSON.stringify(value) : value
      return `${key}=${v}`
    })

    if (env) {
      Object.entries(env).forEach(([key, value]) => {
        argList.push(`${key}=${value}`)
      })
    }

    try {
      await this.pullImage('ubuntu:latest')

      const container = await this.docker.createContainer({
        name: containerName,
        Image: 'ubuntu:latest',
        HostConfig: {
          Binds: [`${skillDir}:${workDir}`],
          Tmpfs: {
            '/tmp': 'rw,size=100m',
          },
        },
        WorkingDir: workDir,
        Env: argList,
        Cmd: ['sh', '-c', `cd ${workDir} && bash ${scriptPath}}`],
        User: 'root',
      })

      await container.start()

      const attachOptions = {
        log: true,
        stdout: true,
        stderr: true,
        stream: true,
      }

      const stream = await container.attach(attachOptions)
      const output: Buffer[] = []

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          output.push(chunk)
        })

        container.wait((err: Error | null, data: any) => {
          if (err) {
            reject(err)
            return
          }

          const result = Buffer.concat(output).toString('utf-8')

          container.remove({ force: true }).catch((removeErr: Error) => {
            console.error('Failed to remove container:', removeErr)
          })

          resolve(result)
        })
      })
    } catch (error) {
      try {
        const container = this.docker.getContainer(containerName)
        await container.remove({ force: true })
      } catch (cleanupError) {
        console.error('Failed to cleanup container:', cleanupError)
      }
      throw error
    }
  }

  private async pullImage(imageName: string): Promise<void> {
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
