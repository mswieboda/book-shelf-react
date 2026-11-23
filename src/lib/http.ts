import axios, { type InternalAxiosRequestConfig } from 'axios'

export const serverApi = axios.create({ baseURL: '/api', timeout: 10_000 })

// `config.method` is lowercase ('get'); `config.url` is relative to baseURL ('/shelf').
// `config.params` holds query params separately (e.g. { status: 'reading' }).
const describe = (config?: InternalAxiosRequestConfig) =>
  `${config?.method?.toUpperCase()} ${config?.url}`

// --- Request Interceptor ---
serverApi.interceptors.request.use(config => {
  // console log in DEV
  if (import.meta.env.DEV) console.log('→', describe(config), config.params ?? '')

  return config // must return the config, or the request is sent with `undefined`
})

// --- Response Interceptor ---

export type ApiErrorCode = 'TIMEOUT' | 'NETWORK' | 'CANCELED' | 'HTTP' | 'UNKNOWN'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number | null

  constructor(message: string, code: ApiErrorCode, status: number | null = null) {
    super(message)

    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

serverApi.interceptors.response.use(
  response => response,
  (error: unknown) => Promise.reject(toApiError(error))
)

const toApiError = (error: unknown): ApiError =>  {
  if (axios.isCancel(error)) return new ApiError('Request canceled', 'CANCELED')
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') return new ApiError('Request timed out', 'TIMEOUT')
    if (!error.response) return new ApiError('Network error', 'NETWORK')

    const data = error?.response?.data

    return new ApiError(data?.error ?? error.message, 'HTTP', error.response.status)
  }

  return new ApiError('Unknown error', 'UNKNOWN')
}
