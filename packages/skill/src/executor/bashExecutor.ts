import { spawn } from 'child_process'
import { NSkillLoader } from '../loader/type'

export default class BashExecutor implements NSkillLoader.Executor {
  async execute(script: string, args: Record<string, any>): Promise<string> {
    return new Promise((resolve, reject) => {
      const output: string[] = []
      const errors: string[] = []

      const env = {
        ...Object.fromEntries(
          Object.entries(args).map(([key, value]) => [
            key,
            typeof value === 'object' ? JSON.stringify(value) : String(value),
          ]),
        ),
      }

      const bash = spawn('bash', ['-c', script], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      bash.stdout.on('data', (data) => {
        output.push(data.toString())
      })

      bash.stderr.on('data', (data) => {
        errors.push(data.toString())
      })

      bash.on('close', (code) => {
        if (code !== 0) {
          const errorMsg =
            errors.length > 0
              ? errors.join('\n')
              : `Command exited with code ${code}`
          resolve(`ERROR: ${errorMsg}`)
        } else {
          resolve(output.join('\n'))
        }
      })

      bash.on('error', (error) => {
        resolve(`ERROR: ${error.message}`)
      })
    })
  }
}
