// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RoomActionQueue from './RoomActionQueue.vue'
import type { RoomMonitorParticipant, RoomMonitorSession } from '../types'

const session = (
  overrides: Partial<RoomMonitorSession> = {},
): RoomMonitorSession => ({
  sessionId: 'x1',
  client: 'SEB',
  status: 'IN_PROGRESS',
  startedAt: '2026-11-02T01:00:00.000Z',
  deadline: '2026-11-02T02:30:00.000Z',
  scheduleEndsAt: '2026-11-02T04:00:00.000Z',
  submittedAt: null,
  extraMinutes: 0,
  answeredCount: 10,
  syncedAnswerCount: 10,
  unsyncedCount: 0,
  lastSeenAt: new Date().toISOString(),
  batteryLevel: 80,
  isCharging: false,
  dndGranted: true,
  lockTaskActive: true,
  batteryUnrestricted: true,
  kioskMode: 'STRICT',
  violationCount: 0,
  lockedByViolation: false,
  requiresTokenReentry: false,
  lastEvent: null,
  ...overrides,
})

const participant = (
  id: string,
  name: string,
  overrides: Partial<RoomMonitorSession> | null,
): RoomMonitorParticipant => ({
  seatNumber: 1,
  participantNumber: null,
  studentId: id,
  studentName: name,
  nis: id,
  classroomName: 'VII A',
  subjectName: 'Matematika',
  packageTitle: 'UAS Ganjil',
  scheduleId: 's1',
  totalQuestions: 50,
  session: overrides === null ? null : session(overrides),
  absence: null,
})

const mountQueue = (participants: RoomMonitorParticipant[]) =>
  mount(RoomActionQueue, { props: { participants, canRecover: true } })

describe('RoomActionQueue', () => {
  it('lists a participant who has not been heard from for over a minute', () => {
    const silent = new Date(Date.now() - 5 * 60_000).toISOString()
    const wrapper = mountQueue([
      participant('a', 'Ahmad', { lastSeenAt: silent }),
      participant('b', 'Budi', {}),
    ])

    expect(wrapper.text()).toContain('Perlu Tindakan (1)')
    expect(wrapper.text()).toContain('Ahmad')
    expect(wrapper.text()).toContain('Tidak ada kabar 5 menit')
    expect(wrapper.text()).not.toContain('Budi')
  })

  it('ignores participants who finished or have not started', () => {
    const silent = new Date(Date.now() - 5 * 60_000).toISOString()
    const wrapper = mountQueue([
      participant('a', 'Ahmad', { status: 'SUBMITTED', lastSeenAt: silent }),
      participant('b', 'Budi', null),
    ])

    expect(wrapper.text()).toContain('Perlu Tindakan')
    expect(wrapper.text()).not.toContain('Perlu Tindakan (')
  })

  it('lists locked participants with the reopen action', () => {
    const wrapper = mountQueue([
      participant('a', 'Ahmad', { lockedByViolation: true }),
    ])

    expect(wrapper.text()).toContain('Terkunci pelanggaran')
    expect(wrapper.text()).toContain('Buka Kembali')
  })
})
