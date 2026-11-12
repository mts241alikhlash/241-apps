import type { Client } from 'openapi-fetch'
import type { PaginationMeta } from '../types/api'
import {
  API_BASE_URL,
  getAccessToken,
  handleRefreshFailure,
  refreshAccessToken,
} from './auth-session'

export type ApiClientOptions = {
  baseUrl: string
  fetch?: typeof globalThis.fetch
  headers?: HeadersInit
}

export interface ServiceErrorBody {
  statusCode?: number
  message?: string | string[]
  code?: string
}

export class ServiceRequestError extends Error {
  readonly code?: string
  readonly response: { status: number; data: ServiceErrorBody }

  constructor(status: number, data: ServiceErrorBody, code?: string) {
    const message = Array.isArray(data.message)
      ? data.message.join(', ')
      : (data.message ?? `Request failed with status ${status}`)
    super(message)
    this.name = 'ServiceRequestError'
    this.code = code ?? data.code
    this.response = { status, data }
  }
}

type Result<T> = Promise<{
  data?: T
  error?: unknown
  response: Response
}>

function isAuthPath(url: string): boolean {
  return new URL(url, 'http://localhost').pathname.includes('/auth/')
}

export function createServiceClient<Paths extends {}>(
  create: (options: ApiClientOptions) => Client<Paths>,
): Client<Paths> {
  const clones = new Map<string, Request>()
  const client = create({ baseUrl: API_BASE_URL })

  client.use({
    onRequest({ request: original, id }) {
      const request = new Request(original, { credentials: 'include' })
      const token = getAccessToken()
      if (token) request.headers.set('Authorization', `Bearer ${token}`)
      clones.set(id, request.clone())
      return request
    },
    async onResponse({ request, response, id, options }) {
      const retry = clones.get(id)
      clones.delete(id)
      if (response.status !== 401 || !retry || isAuthPath(request.url)) {
        return response
      }
      try {
        const token = await refreshAccessToken()
        retry.headers.set('Authorization', `Bearer ${token}`)
        return await options.fetch(retry)
      } catch (error) {
        handleRefreshFailure(error)
        return response
      }
    },
    onError({ id }) {
      clones.delete(id)
    },
  })

  return client
}

async function settle<T>(result: Result<T>): Promise<T | undefined> {
  let outcome: Awaited<Result<T>>
  try {
    outcome = await result
  } catch (error) {
    if (error instanceof ServiceRequestError) throw error
    const message = error instanceof Error ? error.message : 'Network Error'
    const wrapped = new ServiceRequestError(0, { message }, 'ERR_NETWORK')
    wrapped.cause = error
    throw wrapped
  }
  const { data, error, response } = outcome
  if (!response.ok) {
    let body: ServiceErrorBody = {}
    if (error && typeof error === 'object') body = error as ServiceErrorBody
    else if (typeof error === 'string' && error) body = { message: error }
    throw new ServiceRequestError(response.status, body)
  }
  return data
}

export async function unwrap<T>(result: Result<{ data?: T }>): Promise<T> {
  return (await settle(result))?.data as T
}

export async function unwrapPage<
  T,
  M extends Partial<PaginationMeta> = Partial<PaginationMeta>,
>(
  result: Result<{ data?: T[]; meta?: M }>,
): Promise<{ data: T[]; meta: PaginationMeta & M }> {
  const body = await settle(result)
  return {
    data: body?.data ?? [],
    meta: { total: 0, page: 1, limit: 0, ...body?.meta } as PaginationMeta & M,
  }
}

export async function unwrapBlob(result: Result<Blob>): Promise<Blob> {
  return (await settle(result)) as Blob
}
