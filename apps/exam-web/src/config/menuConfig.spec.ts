import { computed, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useMenuVisibility } from '@mts241alikhlash/web-shared/composables/useMenuVisibility'
import { menuSections } from './menuConfig'

function visibleUrls(permissions: string[], roles: string[] = []) {
  const { filteredSections } = useMenuVisibility(menuSections, {
    roles: ref(roles),
    permissions: ref(permissions),
  })
  return computed(() =>
    filteredSections.value.flatMap((section) =>
      section.items.flatMap((item) =>
        item.items ? item.items.map((sub) => sub.url) : [item.url],
      ),
    ),
  ).value
}

const PRINCIPAL_PERMISSIONS = [
  'exam-events.read',
  'exam-schedules.read',
  'exam-questions.read',
  'exam-packages.read',
  'exam-sessions.read',
  'exam-rooms.read-all',
  'exam-grading.read',
  'exam-grading.read-all',
  'exam-scores.read',
  'exam-scores.read-all',
]

const TEACHER_PERMISSIONS = [
  'exam-questions.read',
  'exam-questions.create',
  'exam-questions.update',
  'exam-questions.delete',
  'exam-packages.read',
  'exam-packages.create',
  'exam-packages.update',
  'exam-packages.delete',
  'exam-schedules.read',
  'exam-schedules.create',
  'exam-schedules.update',
  'exam-schedules.cancel',
  'exam-schedules.manage',
  'exam-schedules.access-code',
  'exam-sessions.read',
  'exam-grading.read',
  'exam-grading.grade',
  'exam-scores.read',
]

const EXAM_SUPERVISOR_PERMISSIONS = [
  'exam-rooms.supervise',
  'exam-sessions.release',
]

const EXAM_TECHNICIAN_PERMISSIONS = [
  'exam-rooms.technician',
  'exam-schedules.access-code',
  'exam-schedules.read',
  'exam-sessions.read',
  'exam-sessions.release',
]

const CURRICULUM_STAFF_PERMISSIONS = [
  'exam-events.read',
  'exam-events.manage',
  'exam-rooms.manage-all',
  'exam-questions.read',
  'exam-packages.read',
  'exam-schedules.read',
  'exam-schedules.create',
  'exam-schedules.manage',
  'exam-schedules.update',
  'exam-schedules.cancel',
  'exam-schedules.access-code',
  'exam-sessions.read',
  'exam-sessions.release',
  'exam-grading.read',
  'exam-grading.read-all',
  'exam-scores.read',
  'exam-scores.read-all',
]

const EXAM_ADMIN_PERMISSIONS = [
  ...CURRICULUM_STAFF_PERMISSIONS,
  'exam-schedules.manage-all',
  'exam-settings.manage',
  'exam-questions.create',
  'exam-questions.update',
  'exam-questions.delete',
  'exam-questions.approve',
  'exam-questions.manage-all',
  'exam-packages.create',
  'exam-packages.update',
  'exam-packages.delete',
  'exam-packages.adjust-key',
]

describe('menuConfig RBAC visibility', () => {
  it('shows EXAM_SUPERVISOR only Monitoring and Berita Acara', () => {
    expect(
      visibleUrls(EXAM_SUPERVISOR_PERMISSIONS, ['EXAM_SUPERVISOR']),
    ).toEqual(['/exam/rooms', '/exam/reports'])
  })

  it('shows EXAM_TECHNICIAN Monitoring, Monitoring Semua Ruang, and Berita Acara only', () => {
    expect(
      visibleUrls(EXAM_TECHNICIAN_PERMISSIONS, ['EXAM_TECHNICIAN']),
    ).toEqual(['/exam/rooms', '/exam/monitoring', '/exam/reports'])
  })

  it('shows PRINCIPAL all read-only exam and classwork items without approvals, participant numbers, or settings', () => {
    const urls = visibleUrls(PRINCIPAL_PERMISSIONS, ['PRINCIPAL'])

    expect(urls).toEqual([
      '/exam/packages',
      '/exam/events',
      '/exam/room-setup',
      '/exam/seat-assignment',
      '/exam/activities',
      '/exam/schedules',
      '/exam/supervisor-schedule',
      '/exam/rooms',
      '/exam/monitoring',
      '/exam/reports',
      '/exam/grading',
      '/exam/print/schedule',
      '/exam/print/cards',
      '/exam/print/desks',
      '/exam/print/student-attendance',
      '/exam/print/staff-attendance',
      '/exam/print/grading-sheet',
      '/classwork/activities',
      '/classwork/schedules',
      '/classwork/grading',
      '/classwork/print/grading-sheet',
    ])
    expect(urls).not.toContain('/exam/package-approvals')
    expect(urls).not.toContain('/exam/participant-numbers')
    expect(urls).not.toContain('/settings/presets')
    expect(urls).not.toContain('/settings/seb')
  })

  it('shows TEACHER Bank Soal, Grading, and Non-ujian without Persiapan or Ujian Kegiatan/Jadwal', () => {
    const urls = visibleUrls(TEACHER_PERMISSIONS, ['TEACHER'])

    expect(urls).toEqual([
      '/exam/packages',
      '/exam/grading',
      '/exam/print/grading-sheet',
      '/classwork/activities',
      '/classwork/schedules',
      '/classwork/grading',
      '/classwork/print/grading-sheet',
    ])
    expect(urls).not.toContain('/exam/events')
    expect(urls).not.toContain('/exam/room-setup')
    expect(urls).not.toContain('/exam/activities')
    expect(urls).not.toContain('/exam/schedules')
  })

  it('shows CURRICULUM_STAFF Persiapan and operational items without approvals or settings', () => {
    const urls = visibleUrls(CURRICULUM_STAFF_PERMISSIONS, ['CURRICULUM_STAFF'])

    expect(urls).toContain('/exam/events')
    expect(urls).toContain('/exam/participant-numbers')
    expect(urls).toContain('/exam/activities')
    expect(urls).toContain('/exam/schedules')
    expect(urls).not.toContain('/exam/package-approvals')
    expect(urls).not.toContain('/settings/presets')
    expect(urls).not.toContain('/settings/seb')
  })

  it('shows EXAM_ADMIN settings and approvals', () => {
    const urls = visibleUrls(EXAM_ADMIN_PERMISSIONS, ['EXAM_ADMIN'])

    expect(urls).toContain('/exam/package-approvals')
    expect(urls).toContain('/exam/participant-numbers')
    expect(urls).toContain('/settings/presets')
    expect(urls).toContain('/settings/seb')
  })

  it('shows ACADEMIC_ADMIN and STUDENT appropriate menus', () => {
    expect(
      visibleUrls(
        ['exam-scores.read', 'exam-scores.read-all'],
        ['ACADEMIC_ADMIN'],
      ),
    ).toEqual([])
    expect(visibleUrls(['exam-sessions.take'], ['STUDENT'])).toEqual([
      '/my-exams',
    ])
  })
})
