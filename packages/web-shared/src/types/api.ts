export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages?: number
}

export interface ApiPaginatedResponse<
  T,
  M extends PaginationMeta = PaginationMeta,
> {
  data: T[]
  meta: M
}

export interface ApiSingleResponse<T> {
  data: T
}

export interface ApiEnvelope<T> {
  statusCode: number
  message: string | string[]
  data: T | null
}
