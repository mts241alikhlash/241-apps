import {
  Droplet,
  LayoutDashboard,
  FolderOpen,
  Building2,
  KeyRound,
  ListChecks,
  ScrollText,
  Shield,
  Users,
} from '@lucide/vue'

export type {
  SubMenuItem,
  MenuItem,
  MenuSection,
} from '@mts241alikhlash/web-shared/types/menu.types'
import type { MenuSection } from '@mts241alikhlash/web-shared/types/menu.types'

export const menuSections: MenuSection[] = [
  {
    key: 'overview',
    label: 'menu.section.overview',
    items: [
      {
        title: 'menu.dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    key: 'access',
    label: 'menu.section.access',
    items: [
      {
        title: 'menu.users',
        url: '/setting/user',
        icon: Users,
        requiredPermission: 'users.read',
      },
      {
        title: 'menu.roles',
        url: '/setting/role',
        icon: Shield,
        requiredPermission: 'roles.read',
      },
      {
        title: 'menu.permissions',
        url: '/setting/permission',
        icon: KeyRound,
        requiredPermission: 'permissions.manage',
      },
    ],
  },
  {
    key: 'institution',
    label: 'menu.section.institution',
    items: [
      {
        title: 'menu.schoolUnit',
        url: '/school-unit',
        icon: Building2,
        requiredPermission: 'school-units.read',
      },
      {
        title: 'menu.schoolUnitTypes',
        url: '/setting/school-unit-type',
        icon: ListChecks,
        requiredPermission: 'school-unit-types.read',
      },
    ],
  },
  {
    key: 'files',
    label: 'menu.section.files',
    items: [
      {
        title: 'menu.files',
        url: '/files',
        icon: FolderOpen,
        requiredPermission: 'files.read',
      },
    ],
  },
  {
    key: 'reference',
    label: 'menu.section.reference',
    items: [
      {
        title: 'menu.religions',
        url: '/setting/religion',
        icon: ListChecks,
        requiredPermission: 'religions.read',
      },
      {
        title: 'menu.bloodTypes',
        url: '/setting/blood-type',
        icon: Droplet,
        requiredPermission: 'blood-types.read',
      },
    ],
  },
  {
    key: 'audit',
    label: 'menu.section.audit',
    items: [
      {
        title: 'menu.auditLogs',
        url: '/setting/audit-log',
        icon: ScrollText,
        requiredPermission: 'audit-logs.read',
      },
    ],
  },
]
