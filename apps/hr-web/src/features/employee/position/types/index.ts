import type { components } from '@mts241alikhlash/hr-api'
export type PositionCategoryOption =
  components['schemas']['PositionCategoryResponseDto']
export type Position = components['schemas']['PositionResponseDto']

export interface PositionSavePayload {
  name: string
  categoryId: string
  isActive?: boolean
}

export interface PositionUpdatePayload {
  name?: string
  categoryId?: string
  isActive?: boolean
}

export interface PositionQueryParams {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  isActive?: boolean
}

export interface PositionColumnActions {
  onEdit?: (item: Position) => void
  onDelete?: (
    item: Position,
    callbacks: { closeAlert: () => void; setLoading: (s: boolean) => void },
  ) => Promise<void>
  showActions?: boolean
  canUpdate?: boolean
  canDelete?: boolean
}
