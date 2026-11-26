// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RoomReportDocument from './RoomReportDocument.vue'
import type { RoomReport } from '../types'

const row = (subjectName: string | null, gradeId: string) => ({
  scheduleId: null,
  deliveryMode: 'ONLINE' as 'ONLINE' | 'OFFLINE',
  offlineKind: null as 'WRITTEN' | 'PRACTICAL' | null,
  activityId: `a-${gradeId}`,
  packageTitle: null,
  subjectName,
  gradeId,
  classroomName: null,
  startsAt: '2026-11-23T00:00:00.000Z',
  endsAt: '2026-11-23T01:15:00.000Z',
  registeredCount: 10,
  startedCount: 0 as number | null,
  submittedCount: 0 as number | null,
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

  const mountRows = (schedules: ReturnType<typeof row>[]) =>
    mount(RoomReportDocument, {
      props: {
        report: report(schedules),
        room: {
          name: 'R01',
          currentSupervisorName: null,
          technicianName: null,
        },
      },
    })

  it('lists an online row with its times and counts, keeping zero', () => {
    const wrapper = mountRows([
      { ...row('Fiqih', 'g7'), startedCount: 0, submittedCount: 4 },
    ])
    const line = wrapper.find('tr[data-row]')

    expect(line.text()).toContain('Fiqih')
    expect(line.find('[data-cell="startsAt"]').text()).toMatch(/^\d{2}:\d{2}$/)
    expect(line.find('[data-cell="endsAt"]').text()).toMatch(/^\d{2}:\d{2}$/)
    expect(line.find('[data-cell="started"]').text()).toBe('0')
    expect(line.find('[data-cell="submitted"]').text()).toBe('4')
    expect(line.text()).not.toContain('Offline')
  })

  it('lists an offline row with marker, kind and attendance but no counts', () => {
    const wrapper = mountRows([
      {
        ...row('Tafsir', 'g7'),
        deliveryMode: 'OFFLINE',
        offlineKind: 'PRACTICAL',
        startedCount: null,
        submittedCount: null,
        absentCount: 3,
      },
    ])
    const line = wrapper.find('tr[data-row]')

    expect(line.text()).toContain('Offline')
    expect(line.text()).toContain('Practical')
    expect(line.find('[data-cell="startsAt"]').text()).toMatch(/^\d{2}:\d{2}$/)
    expect(line.find('[data-cell="registered"]').text()).toBe('10')
    expect(line.find('[data-cell="present"]').text()).toBe('7')
    expect(line.find('[data-cell="absent"]').text()).toBe('3')
    expect(line.find('[data-cell="started"]').text()).toBe('-')
    expect(line.find('[data-cell="submitted"]').text()).toBe('-')
    expect(wrapper.text()).not.toContain('null')
  })

  it('falls back to the subject name when the package title is null', () => {
    const wrapper = mountRows([
      { ...row('Prakarya', 'g7'), startedCount: null, submittedCount: null },
    ])

    expect(wrapper.find('tr[data-row]').text()).toContain('Prakarya')
  })
})
