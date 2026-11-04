export const POST_TYPES = ['BERITA', 'ARTIKEL', 'PENGUMUMAN'] as const
export type PostType = (typeof POST_TYPES)[number]

export const CONTENT_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
] as const
export type ContentStatus = (typeof CONTENT_STATUSES)[number]

export interface PostCategoryRef {
  id: string
  name: string
  slug: string
}

export interface PostTagRef {
  id: string
  name: string
  slug: string
}

export interface PostSummary {
  id: string
  type: PostType
  title: string
  slug: string
  summary: string
  coverImageUrl: string | null
  coverAltText: string | null
  category: PostCategoryRef | null
  authorName: string
  publishedAt: string
  isPinned: boolean
  tags: PostTagRef[]
}

export interface PostDetail extends Omit<PostSummary, 'isPinned'> {
  body: string
  updatedAt: string
  expiresAt: string | null
  attachmentUrl: string | null
  metaTitle: string
  metaDescription: string
  tags: PostTagRef[]
}

export interface PostAdminSummary {
  id: string
  type: PostType
  title: string
  slug: string
  status: ContentStatus
  category: PostCategoryRef | null
  authorName: string
  publishedAt: string | null
  pinnedAt: string | null
  version: number
  updatedAt: string
  deletedAt: string | null
}

export interface PostAdminDetail extends PostAdminSummary {
  summary: string
  body: string
  coverFileId: string | null
  coverAltText: string | null
  coverImageUrl: string | null
  scheduledAt: string | null
  expiresAt: string | null
  attachmentFileId: string | null
  metaTitle: string | null
  metaDescription: string | null
  tags: PostTagRef[]
  authorId: string
  createdAt: string
}

export interface CreatePostPayload {
  type: PostType
  title: string
  summary: string
  body: string
  slug?: string
  coverFileId?: string
  coverAltText?: string
  categoryId?: string
  metaTitle?: string
  metaDescription?: string
  tags?: string[]
  expiresAt?: string
  attachmentFileId?: string
}

export type UpdatePostPayload = Partial<Omit<CreatePostPayload, 'type'>> & {
  version: number
}

export interface PublishPostPayload {
  version: number
  scheduledAt?: string
}

export interface VersionPayload {
  version: number
}

export interface PinPostPayload extends VersionPayload {
  pinned: boolean
}

export interface PostQuery {
  page?: number
  limit?: number
  type?: PostType
  status?: ContentStatus
  categoryId?: string
  search?: string
  includeDeleted?: boolean
}

export interface PublicPostQuery {
  type: PostType
  page?: number
  limit?: number
  categorySlug?: string
  tagSlug?: string
  search?: string
  scope?: 'active' | 'archive'
}

export const POST_TYPE_LABELS: Record<PostType, string> = {
  BERITA: 'Berita',
  ARTIKEL: 'Artikel',
  PENGUMUMAN: 'Pengumuman',
}

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: 'Draf',
  SCHEDULED: 'Terjadwal',
  PUBLISHED: 'Terbit',
  ARCHIVED: 'Arsip',
}

export const POST_TYPE_SLUGS: Record<PostType, string> = {
  BERITA: 'berita',
  ARTIKEL: 'artikel',
  PENGUMUMAN: 'pengumuman',
}
