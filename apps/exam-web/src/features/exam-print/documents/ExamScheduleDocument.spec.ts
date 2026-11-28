// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ExamScheduleDocument from './ExamScheduleDocument.vue'
import type { PrintSchedule } from '../types'

vi.mock('@/features/exam-shared/usePackageSubjects', () => ({
  usePackageSubjects: () => ({
    subjectOf: (_id: string | null, title: string | null) => title ?? '-',
  }),
}))

const schedule = (mode: 'ONLINE' | 'OFFLINE'): PrintSchedule =>
  ({
    id: `s-${mode}`,
    classroomName: 'Kelas VII-A',
    packageId: null,
    packageTitle: mode === 'ONLINE' ? 'Fiqih' : 'Tafsir',
    deliveryMode: mode,
    startsAt: '2026-11-24T00:00:00.000Z',
    endsAt: '2026-11-24T01:15:00.000Z',
    status: 'SCHEDULED',
  }) as unknown as PrintSchedule

describe('ExamScheduleDocument', () => {
  it.each(['ONLINE', 'OFFLINE'] as const)(
    'labels the start and the end of a %s row',
    (mode) => {
      const wrapper = mount(ExamScheduleDocument, {
        props: {
          event: {
            id: 'e1',
            name: 'ASAS',
            startsAt: '2026-11-23T00:00:00.000Z',
          },
          schedules: [schedule(mode)],
        } as never,
        global: { stubs: { LetterheadKop: true } },
      })

      expect(wrapper.find('td.col-time').text()).toMatch(
        /Mulai \d{2}:\d{2}\s*Selesai \d{2}:\d{2}/,
      )
    },
  )
})
