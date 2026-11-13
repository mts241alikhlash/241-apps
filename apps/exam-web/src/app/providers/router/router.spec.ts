import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { appLayout, landingPath, routes } from './routes'
import { menuSections } from '@/config/menuConfig'
import en from '@/i18n/locales/en'
import id from '@/i18n/locales/id'

const router = () => createRouter({ history: createMemoryHistory(), routes })

describe('exam route tree', () => {
  it.each([
    '/exam/events',
    '/exam/events/e1',
    '/exam/packages',
    '/exam/package-approvals',
    '/exam/activities',
    '/exam/activities/new',
    '/exam/activities/a1',
    '/exam/schedules',
    '/exam/grading',
    '/exam/prints/cards',
    '/exam/prints/seats',
    '/classwork/activities',
    '/classwork/activities/new',
    '/classwork/activities/a1',
    '/classwork/schedules',
    '/classwork/grading',
    '/settings/presets',
    '/settings/seb',
    '/my-exams',
    '/my-exams/sessions/s1',
    '/profile',
  ])('resolves %s', (path) => {
    expect(router().resolve(path).name).not.toBe('not-found')
  })

  it('sets category meta on exam and classwork routes and keeps route names unique', () => {
    const instance = router()
    expect(instance.resolve('/exam/activities').meta.category).toBe('EXAM')
    expect(instance.resolve('/exam/activities/a1').meta.category).toBe('EXAM')
    expect(instance.resolve('/exam/schedules').meta.category).toBe('EXAM')
    expect(instance.resolve('/exam/grading').meta.category).toBe('EXAM')
    expect(instance.resolve('/classwork/activities').meta.category).toBe(
      'NON_EXAM',
    )
    expect(instance.resolve('/classwork/activities/a1').meta.category).toBe(
      'NON_EXAM',
    )
    expect(instance.resolve('/classwork/schedules').meta.category).toBe(
      'NON_EXAM',
    )
    expect(instance.resolve('/classwork/grading').meta.category).toBe(
      'NON_EXAM',
    )

    const names = instance
      .getRoutes()
      .map((r) => r.name)
      .filter((name): name is string | symbol => Boolean(name))
    expect(new Set(names).size).toBe(names.length)
  })

  it.each([
    '/assessment/items',
    '/student-scores',
    '/report-card',
    '/attendance/input',
    '/exam-scores',
    '/dashboard',
  ])('does not resolve %s', (path) => {
    expect(router().resolve(path).name).toBe('not-found')
  })

  it('renders every page route through the shipped app layout', () => {
    const instance = router()
    const layout = routes.find((route) => route.path === '/')
    for (const child of layout?.children ?? []) {
      const resolved = instance.resolve(child.path)
      expect(resolved.matched, child.path).toHaveLength(2)
      expect(resolved.matched[0]?.components?.default, child.path).toBe(
        appLayout,
      )
    }
  })

  it('keeps the exam sheet outside the app layout', () => {
    const resolved = router().resolve('/my-exams/sessions/s1')
    expect(resolved.matched).toHaveLength(1)
    expect(resolved.matched[0]?.components?.default).not.toBe(appLayout)
  })

  it('states a trail on every route inside the layout', () => {
    for (const route of routes) {
      if (route.redirect || route.path === '/:pathMatch(.*)*') continue
      for (const child of route.children ?? []) {
        expect(child.meta?.breadcrumbs, `${String(child.name)}`).toBeDefined()
      }
    }
  })
})

describe('landing route', () => {
  it('follows the strongest exam permission the user holds', () => {
    expect(landingPath(['exam-schedules.read'])).toBe('/exam/schedules')
    expect(landingPath(['exam-packages.read'])).toBe('/exam/packages')
    expect(landingPath(['exam-grading.read'])).toBe('/exam/grading')
    expect(landingPath(['exam-sessions.take'])).toBe('/my-exams')
  })

  it('falls back to the profile page, which needs no permission', () => {
    const fallback = landingPath(['exam-rooms.read'])
    expect(fallback).toBe('/profile')

    const resolved = router().resolve(fallback)
    expect(resolved.name).not.toBe('not-found')
    expect(resolved.meta.requiresAuth).toBe(true)
    expect(resolved.meta.requiredPermission).toBeUndefined()
  })
})

describe('menu', () => {
  it('links only to paths this app actually routes', () => {
    const instance = router()
    for (const section of menuSections) {
      for (const item of section.items) {
        expect(instance.resolve(item.url).name).not.toBe('not-found')
      }
    }
  })

  it('keeps the bank, exam, classwork, mine and settings sections in order', () => {
    expect(
      menuSections.map((section) => [
        section.key,
        section.items.map((item) => [
          item.url,
          item.requiredPermission,
          item.requiredAnyPermission,
        ]),
      ]),
    ).toEqual([
      [
        'bank',
        [
          ['/exam/packages', 'exam-packages.read', undefined],
          ['/exam/package-approvals', 'exam-questions.approve', undefined],
        ],
      ],
      [
        'exam',
        [
          ['/exam/events', 'exam-events.read', undefined],
          ['/exam/activities', 'exam-schedules.manage', undefined],
          ['/exam/schedules', 'exam-schedules.read', undefined],
          [
            '/exam/rooms',
            undefined,
            [
              'exam-rooms.supervise',
              'exam-rooms.technician',
              'exam-rooms.manage-all',
            ],
          ],
          ['/exam/grading', 'exam-grading.read', undefined],
          [
            '/exam/prints/cards',
            undefined,
            [
              'exam-rooms.supervise',
              'exam-rooms.technician',
              'exam-rooms.manage-all',
            ],
          ],
          [
            '/exam/prints/seats',
            undefined,
            [
              'exam-rooms.supervise',
              'exam-rooms.technician',
              'exam-rooms.manage-all',
            ],
          ],
        ],
      ],
      [
        'classwork',
        [
          ['/classwork/activities', 'exam-schedules.manage', undefined],
          ['/classwork/schedules', 'exam-schedules.read', undefined],
          ['/classwork/grading', 'exam-grading.read', undefined],
        ],
      ],
      ['mine', [['/my-exams', 'exam-sessions.take', undefined]]],
      [
        'settings',
        [
          ['/settings/presets', 'exam-schedules.manage-all', undefined],
          ['/settings/seb', 'exam-schedules.manage-all', undefined],
        ],
      ],
    ])
  })

  it('has both locales covering every key the menu uses', () => {
    const read = (obj: unknown, key: string) =>
      key.split('.').reduce<unknown>((acc, part) => {
        if (acc && typeof acc === 'object' && part in acc) {
          return (acc as Record<string, unknown>)[part]
        }
        return undefined
      }, obj)

    for (const key of menuSections.flatMap((section) => [
      section.label,
      ...section.items.map((item) => item.title),
    ])) {
      expect(read(en, key), `en is missing ${key}`).toBeTypeOf('string')
      expect(read(id, key), `id is missing ${key}`).toBeTypeOf('string')
    }
  })
})
