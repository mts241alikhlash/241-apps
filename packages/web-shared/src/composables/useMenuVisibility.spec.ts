import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import type { MenuSection } from '../types/menu.types'
import { useMenuVisibility } from './useMenuVisibility'

const icon = {} as never

const sections: MenuSection[] = [
  {
    key: 'applicant',
    label: 'Pendaftaran',
    requiredPermission: 'admissions.apply',
    items: [{ title: 'Status', url: '/registration', icon }],
  },
  {
    key: 'admin',
    label: 'Admin',
    requiredPermission: 'admissions.read',
    items: [
      { title: 'Dashboard', url: '/admin', icon },
      {
        title: 'Waves',
        url: '/admin/waves',
        icon,
        requiredPermission: 'admission-waves.read',
      },
      {
        title: 'Either',
        url: '/admin/either',
        icon,
        requiredAnyPermission: ['a.read', 'b.read'],
      },
    ],
  },
]

function visible(roles: string[], permissions: string[]) {
  const { filteredSections } = useMenuVisibility(sections, {
    roles: ref(roles),
    permissions: ref(permissions),
  })
  return filteredSections.value.flatMap((section) =>
    section.items.map((item) => item.url),
  )
}

describe('useMenuVisibility', () => {
  it('shows an item only when the user holds its permission', () => {
    expect(visible(['ADMISSION_ADMIN'], ['admissions.read'])).toEqual([
      '/admin',
    ])
    expect(
      visible(['ADMISSION_ADMIN'], ['admissions.read', 'admission-waves.read']),
    ).toEqual(['/admin', '/admin/waves'])
  })

  it('honors requiredAnyPermission', () => {
    expect(visible([], ['admissions.read', 'b.read'])).toEqual([
      '/admin',
      '/admin/either',
    ])
  })

  it('treats a super admin like everyone else: only what its permissions allow', () => {
    expect(visible(['SUPER_ADMIN'], ['admissions.read'])).toEqual(['/admin'])
    expect(visible(['SUPER_ADMIN'], [])).toEqual([])
  })

  it('shows a super admin everything its permissions cover', () => {
    expect(
      visible(
        ['SUPER_ADMIN'],
        [
          'admissions.apply',
          'admissions.read',
          'admission-waves.read',
          'a.read',
        ],
      ),
    ).toEqual(['/registration', '/admin', '/admin/waves', '/admin/either'])
  })
})
