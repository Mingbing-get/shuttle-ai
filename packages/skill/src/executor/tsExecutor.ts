import DockerExecutor from './dockerExecutor'
import { NSkillLoader } from '../loader/type'

export default class TsExecutor
  extends DockerExecutor
  implements NSkillLoader.Executor
{
  async execute(options: NSkillLoader.ScriptExecuteOptions): Promise<string> {
    const { skillDir, scriptPath, args, env } = options

    const containerName = `skill-executor-${Date.now()}`

    const argList = Object.entries(args).map(([key, value]) => {
      const v = typeof value === 'object' ? JSON.stringify(value) : value
      return `${key}=${v}`
    })

    if (env) {
      Object.entries(env).forEach(([key, value]) => {
        argList.push(`${key}=${value}`)
      })
    }

    let workDir = '/workspace'
    let hostBind = `${skillDir}:${workDir}`
    let cmd = `cd ${workDir} && npm install -g tsx && npx tsx ${scriptPath}`
    if (await this.checkIfRunningInDocker()) {
      const runInDockerConfig = options.runInDocker
      if (!runInDockerConfig) {
        throw new Error('主程序运行在docker中, 但未配置runInDocker参数')
      }

      workDir = runInDockerConfig.workDir
      hostBind = `${runInDockerConfig.sharedVolumeName}:${workDir}`
      cmd = `cd ${skillDir} && npm install -g tsx && npx tsx ${scriptPath}`
    }

    try {
      await this.pullImage('node:18-alpine')

      const container = await this.docker.createContainer({
        name: containerName,
        Image: 'node:18-alpine',
        HostConfig: {
          Binds: [hostBind],
          Tmpfs: {
            '/tmp': 'rw,size=100m',
          },
        },
        WorkingDir: workDir,
        Env: argList,
        Cmd: ['sh', '-c', cmd],
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
}
