export interface PostCategory {
  id: string
  name: string
  slug: string
  description: string | null
  isActive: boolean
  displayOrder: number
}

export interface PublicPostCategory extends PostCategory {
  publishedCount: number
}

export interface PostTag {
  id: string
  name: string
  slug: string
}

export interface CategoryCreatePayload {
  name: string
  slug?: string
  description?: string
  isActive?: boolean
  displayOrder?: number
}

export type CategoryUpdatePayload = Partial<CategoryCreatePayload>

export interface TagCreatePayload {
  name: string
}

export type TagUpdatePayload = TagCreatePayload
