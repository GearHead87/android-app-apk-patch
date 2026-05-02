export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
export type AuthSystem = 'medex' | 'acibd' | 'none'
export type BadgeKind = 'first' | 'auth' | 'otp' | 'public' | 'unconfirmed'

export interface KV {
  id: string
  key: string
  value: string
  enabled: boolean
}

export interface EndpointDef {
  id: string
  groupId: string
  groupLabel: string
  groupIcon: string
  name: string
  method: HttpMethod
  /** Path sent to Vite dev-server proxy, e.g. "/proxy/medex/login" */
  proxyPath: string
  /** Full real URL shown for reference */
  realUrl: string
  defaultHeaders: Omit<KV, 'id'>[]
  defaultParams: Omit<KV, 'id'>[]
  defaultBody: string
  description: string
  requiresAuth: boolean
  authSystem: AuthSystem
  /** If true, a successful response's token is auto-saved */
  isLoginEndpoint: boolean
  /** Dot-path into JSON response to extract token, e.g. "data.authToken" */
  tokenPath?: string
  /** Coloured flow note shown below the title */
  flowNote?: string
  badge?: BadgeKind
}
