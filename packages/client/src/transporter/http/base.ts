import axios, { Method } from 'axios'
import { NHttpTransporter } from './type'

export default class BaseHttpTransporter {
  constructor(private _options?: NHttpTransporter.Options) {}

  protected async request<T>(
    methodConfig: NHttpTransporter.MethodConfig<T> | undefined,
    data: any,
    {
      defaultPath,
      defaultMethod = 'POST',
    }: {
      defaultPath: string
      defaultMethod?: Method
    },
  ) {
    let path = methodConfig?.path || defaultPath
    if (!path.startsWith('/')) {
      path = `/${path}`
    }

    const method = methodConfig?.method || defaultMethod
    const response = await axios({
      url: `${this._options?.baseUrl || ''}${path}`,
      method,
      headers: this._options?.requestHeaders,
      [method === 'GET' ? 'params' : 'data']:
        (await methodConfig?.beforeSend?.(data)) || data,
    })

    await this._options?.afterSend?.(response)
    await methodConfig?.afterSend?.(response)

    return response.data
  }
}
