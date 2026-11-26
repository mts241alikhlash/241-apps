import { describe, expect, it } from 'vitest'
import type { ExamActivityRecord } from '@/features/exam-activity/types'
import { scheduleOfActivity } from './examPrintService'

const activity = (packageId: string | null) =>
  ({
    id: 'a1',
    gradeId: 'g7',
    gradeName: 'VII',
    packageId,
    subjectName: 'Tafsir',
    deliveryMode: 'OFFLINE',
    startsAt: '2026-11-24T00:00:00.000Z',
    endsAt: '2026-11-24T01:15:00.000Z',
  }) as unknown as ExamActivityRecord

describe('scheduleOfActivity', () => {
  it('titles a package-less activity by its subject name', () => {
    const schedule = scheduleOfActivity(activity(null))

    expect(schedule.packageTitle).toBe('Tafsir')
    expect(schedule.packageId).toBe('a1')
    expect(schedule.deliveryMode).toBe('OFFLINE')
  })
})
