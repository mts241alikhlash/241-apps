import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { menuSections } from './menuConfig'
import en from '@/i18n/locales/en'
import id from '@/i18n/locales/id'
import { academicCalendarRoutes } from '@/features/academic/academic-calendar'
import { academicCalendarTypeRoutes } from '@/features/academic/academic-calendar-type'
import { academicInfoRoutes } from '@/features/academic/academic-info'
import { academicSettingRoutes } from '@/features/academic/academic-setting'
import { academicYearRoutes } from '@/features/academic/academic-year'
import { classroomRoutes } from '@/features/academic/classroom'
import { curriculumRoutes } from '@/features/academic/curriculum'
import { curriculumSubjectRoutes } from '@/features/academic/curriculum-subject'
import { gradeRoutes } from '@/features/academic/grade'
import { lessonRoutes } from '@/features/academic/lesson'
import { referenceListRoutes } from '@/features/academic/reference-list'
import { parentRoutes } from '@/features/academic/parent'
import { scheduleRoutes } from '@/features/academic/schedule'
import { semesterRoutes } from '@/features/academic/semester'
import { semesterTypeRoutes } from '@/features/academic/semester-type'
import { studentRoutes } from '@/features/academic/student'
import { studentGraduationRoutes } from '@/features/academic/student-graduation'
import { studentParentRoutes } from '@/features/academic/student-parent'
import { subjectRoutes } from '@/features/academic/subject'
import { teachingAssignmentRoutes } from '@/features/academic/teaching-assignment'
import { timeSlotRoutes } from '@/features/academic/time-slot'

const labels = () =>
  menuSections.flatMap((section) => [
    section.label,
    ...section.items.flatMap((item) => [
      item.title,
      ...(item.items ?? []).map((sub) => sub.title),
    ]),
  ])

describe('menu', () => {
  it('uses translation keys, never literal text', () => {
    for (const label of labels()) {
      expect(label, `${label} is not a key`).toMatch(/^[a-z]+(\.[a-zA-Z]+)+$/)
    }
  })

  it('has both locales covering every key the menu uses, en being the source', () => {
    const read = (obj: unknown, key: string) =>
      key.split('.').reduce<unknown>((acc, part) => {
        if (acc && typeof acc === 'object' && part in acc) {
          return (acc as Record<string, unknown>)[part]
        }
        return undefined
      }, obj)

    for (const key of labels()) {
      expect(read(en, key), `en is missing ${key}`).toBeTypeOf('string')
      expect(read(id, key), `id is missing ${key}`).toBeTypeOf('string')
    }
  })
})

describe('menu urls', () => {
  it('links only to paths this app actually routes', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: { render: () => null },
          children: [
            ...academicCalendarRoutes,
            ...academicCalendarTypeRoutes,
            ...academicInfoRoutes,
            ...academicSettingRoutes,
            ...academicYearRoutes,
            ...classroomRoutes,
            ...curriculumRoutes,
            ...curriculumSubjectRoutes,
            ...gradeRoutes,
            ...lessonRoutes,
            ...referenceListRoutes,
            ...parentRoutes,
            ...scheduleRoutes,
            ...semesterRoutes,
            ...semesterTypeRoutes,
            ...studentRoutes,
            ...studentGraduationRoutes,
            ...studentParentRoutes,
            ...subjectRoutes,
            ...teachingAssignmentRoutes,
            ...timeSlotRoutes,
          ],
        },
        {
          path: '/:pathMatch(.*)*',
          name: 'not-found',
          component: { render: () => null },
        },
      ],
    })

    const urls = menuSections
      .flatMap((section) => section.items)
      .flatMap((item) => [item.url, ...(item.items ?? []).map((s) => s.url)])
      .filter((url) => url !== '#')

    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      expect(router.resolve(url).name, `${url} resolves to not-found`).not.toBe(
        'not-found',
      )
    }
  })
})
