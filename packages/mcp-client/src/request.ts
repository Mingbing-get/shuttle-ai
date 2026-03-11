import { request as httpsRequest } from 'https'
import {
  request as httpRequest,
  IncomingHttpHeaders,
  RequestOptions,
} from 'http'

export default async function request(
  options: Omit<RequestOptions, 'hostname' | 'port' | 'path'> & {
    url: string
    data?: any
  },
) {
  const { url, data, ...rest } = options
  const parsedUrl = new URL(url)
  const isHttps = parsedUrl.protocol === 'https:'
  const requestFn = isHttps ? httpsRequest : httpRequest

  return new Promise<{ header: IncomingHttpHeaders; data: string }>(
    (resolve, reject) => {
      const req = requestFn(
        {
          ...rest,
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname,
        },
        (res) => {
          let buffer = ''

          res.on('data', (chunk: Buffer) => {
            buffer += chunk.toString()
          })

          res.on('end', () => {
            resolve({ header: res.headers, data: buffer })
          })
        },
      )

      req.on('error', (error: Error) => {
        reject(error)
      })

      if (options.data !== undefined && options.data !== null) {
        req.write(JSON.stringify(options.data))
      }
      req.end()
    },
  )
}
