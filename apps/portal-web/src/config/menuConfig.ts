import {
  CalendarDays,
  Images,
  ListChecks,
  Megaphone,
  FileStack,
  FileText,
  Menu,
  Newspaper,
  Settings,
} from '@lucide/vue'

export type {
  SubMenuItem,
  MenuItem,
  MenuSection,
} from '@mts241alikhlash/web-shared/types/menu.types'
import type { MenuSection } from '@mts241alikhlash/web-shared/types/menu.types'

export const menuSections: MenuSection[] = [
  {
    key: 'content',
    label: 'menu.section.content',
    requiredPermission: 'portal-posts.read',
    items: [
      {
        title: 'menu.news',
        url: '/admin/news',
        icon: Newspaper,
      },
      {
        title: 'menu.article',
        url: '/admin/articles',
        icon: FileText,
      },
      {
        title: 'menu.announcement',
        url: '/admin/announcements',
        icon: Megaphone,
      },
      {
        title: 'menu.agenda',
        url: '/admin/agenda',
        icon: CalendarDays,
        requiredPermission: 'portal-agendas.read',
      },
      {
        title: 'menu.gallery',
        url: '/admin/gallery',
        icon: Images,
        requiredPermission: 'portal-albums.read',
      },
    ],
  },

  {
    key: 'portal-settings',
    label: 'menu.section.portalSettings',
    items: [
      {
        title: 'menu.home',
        url: '/admin/home',
        icon: Settings,
        requiredPermission: 'portal-settings.read',
      },
      {
        title: 'menu.page',
        url: '/admin/pages',
        icon: FileStack,
        requiredPermission: 'portal-pages.read',
      },
      {
        title: 'menu.navigation',
        url: '/admin/menu',
        icon: Menu,
        requiredPermission: 'portal-pages.read',
      },
      {
        key: 'settings-reference-data',
        title: 'menu.taxonomy',
        url: '#',
        icon: ListChecks,
        requiredPermission: 'portal-categories.read',
        items: [
          {
            title: 'menu.category',
            url: '/admin/categories',
            requiredPermission: 'portal-categories.read',
          },
          {
            title: 'menu.tag',
            url: '/admin/tags',
            requiredPermission: 'portal-tags.read',
          },
        ],
      },
    ],
  },
]
