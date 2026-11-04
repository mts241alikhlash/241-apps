export interface SubjectSavePayload {
  name: string
  code: string
}

export interface SubjectQueryParams {
  page?: number
  limit?: number
  search?: string
}
