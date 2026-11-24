import axios, {
  type CreateAxiosDefaults,
  type InternalAxiosRequestConfig,
} from 'axios'

// --- Error Types / Classes ---
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

// --- Interceptor helpers ---
// `config.method` is lowercase ('get'); `config.url` is relative to baseURL ('/shelf').
// `config.params` holds query params separately (e.g. { status: 'reading' }).
const describe = (config?: InternalAxiosRequestConfig) =>
  `${config?.method?.toUpperCase()} ${config?.url}`

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

// --- Http Client Factory with Interceptors ---
export const createHttpClient = (config: CreateAxiosDefaults) => {
  const instance = axios.create(config)

  // --- Request Interceptor ---
  instance.interceptors.request.use(config => {
    // console log in DEV
    if (import.meta.env.DEV) {
      const showData = false
      console.log('→', describe(config), config.params ?? '', showData ? config.data : '')
    }

    return config // must return the config, or the request is sent with `undefined`
  })

  // --- Response Interceptor ---
  instance.interceptors.response.use(
    response => {
      // console log in DEV
      if (import.meta.env.DEV) {
        const showData = false
        console.log('←', describe(response.config), showData ? response.data : '')
      }

      return response
    },
    (error: unknown) => Promise.reject(toApiError(error))
  )

  return instance
}

// --- Server API client ---
export const serverApi = createHttpClient({ baseURL: '/api', timeout: 10_000 })
