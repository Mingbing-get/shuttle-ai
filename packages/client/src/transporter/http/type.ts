import { RawAxiosRequestHeaders, AxiosResponse, Method } from 'axios'

export namespace NHttpTransporter {
  export interface MethodConfig<T> {
    path?: string
    method?: Method
    beforeSend?: (data: T) => Promise<T>
    afterSend?: (response: AxiosResponse) => Promise<void>
  }

  export interface Options {
    baseUrl?: string
    requestHeaders?: RawAxiosRequestHeaders
    afterSend?: (response: AxiosResponse) => Promise<void>
  }
}
