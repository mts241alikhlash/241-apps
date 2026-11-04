import type { PublicAgendaEntry } from '@/features/agenda'
import type { PostSummary } from '@/features/post/types'

export type HomepageSectionKind = 'post' | 'agenda' | 'album'

export interface HomepageSection {
  key: string
  displayOrder: number
  kind: HomepageSectionKind
  items: (PostSummary | PublicAgendaEntry)[]
}

export interface HomepageResponse {
  sections: HomepageSection[]
}

export interface HomepageSectionSetting {
  id: string
  key: string
  itemCount: number
  isEnabled: boolean
  displayOrder: number
}

export type UpdateHomepageSectionPayload = Partial<
  Pick<HomepageSectionSetting, 'itemCount' | 'isEnabled' | 'displayOrder'>
>

export const SECTION_TITLES: Record<string, string> = {
  berita: 'Berita Terbaru',
  agenda: 'Agenda Terdekat',
  pengumuman: 'Pengumuman',
  galeri: 'Galeri',
}

export const SECTION_LINKS: Record<string, string> = {
  berita: '/news',
  agenda: '/agenda',
  pengumuman: '/announcements',
  galeri: '/gallery',
}
