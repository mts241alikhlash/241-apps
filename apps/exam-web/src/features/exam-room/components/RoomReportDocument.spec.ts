// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RoomReportDocument from './RoomReportDocument.vue'
import type { RoomReport } from '../types'

const row = (subjectName: string | null, gradeId: string) => ({
  scheduleId: null,
  activityId: `a-${gradeId}`,
  packageTitle: null,
  subjectName,
  gradeId,
  classroomName: null,
  startsAt: '2026-11-23T00:00:00.000Z',
  endsAt: '2026-11-23T01:15:00.000Z',
  registeredCount: 10,
  startedCount: 0,
  submittedCount: 0,
  absentCount: 0,
})

const report = (schedules: ReturnType<typeof row>[]): RoomReport =>
  ({
    reportId: 'r-1',
    roomId: 'room-1',
    slotId: 'slot-1',
    status: 'DRAFT',
    condition: 'NORMAL',
    incidentNotes: null,
    submittedAt: null,
    verifiedAt: null,
    hasAttachment: false,
    attachmentName: null,
    slot: {
      startsAt: '2026-11-23T00:00:00.000Z',
      endsAt: '2026-11-23T01:15:00.000Z',
    },
    schedules,
    absences: [],
    fieldNotes: [],
    auditLogs: [],
  }) as unknown as RoomReport

describe('RoomReportDocument', () => {
  it('names each subject once and speaks of the exam, not the package', () => {
    const wrapper = mount(RoomReportDocument, {
      props: {
        report: report([
          row("Al-Qur'an Hadits", 'g7'),
          row("Al-Qur'an Hadits", 'g8'),
          row("Al-Qur'an Hadits", 'g9'),
        ]),
        room: {
          name: 'R01',
          currentSupervisorName: null,
          technicianName: null,
        },
      },
    })

    const text = wrapper.text()
    expect(text).toContain("ujian mata pelajaran Al-Qur'an Hadits melalui")
    expect(text).not.toContain('paket soal')
    expect(text).toContain('30 (tiga puluh) orang')
  })
})
