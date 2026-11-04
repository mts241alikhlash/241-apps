import type { ContentStatus } from '@/features/post'

export interface PortalPage {
  id: string
  title: string
  slug: string
  body: string
  metaTitle: string | null
  metaDescription: string | null
  status: ContentStatus
  publishedAt: string | null
  authorId: string
  version: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface PublicPage {
  id: string
  title: string
  slug: string
  body: string
  metaTitle: string
  metaDescription: string
  publishedAt: string
  updatedAt: string
}

export interface CreatePagePayload {
  title: string
  slug?: string
  body: string
  metaTitle?: string
  metaDescription?: string
}

export type UpdatePagePayload = Partial<CreatePagePayload> & {
  version: number
}

export interface NavItem {
  id: string
  label: string
  pageId: string | null
  routeKey: string | null
  externalUrl: string | null
  displayOrder: number
  isActive: boolean
}

export interface PublicNavItem {
  id: string
  label: string
  href: string
  isExternal: boolean
}

export interface CreateNavItemPayload {
  label: string
  pageId?: string
  routeKey?: string
  externalUrl?: string
  displayOrder?: number
  isActive?: boolean
}

export type UpdateNavItemPayload = Partial<CreateNavItemPayload>

export const NAV_ROUTE_KEYS = [
  { value: 'berita', label: 'Berita' },
  { value: 'artikel', label: 'Artikel' },
  { value: 'pengumuman', label: 'Pengumuman' },
  { value: 'agenda', label: 'Agenda' },
  { value: 'galeri', label: 'Galeri' },
] as const
