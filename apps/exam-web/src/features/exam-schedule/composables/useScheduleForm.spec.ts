import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useScheduleForm } from './useScheduleForm'
import { toInstant } from '../utils/instant'
import type { ExamSchedule } from '../types'

const { saveSchedule } = vi.hoisted(() => ({ saveSchedule: vi.fn() }))
vi.mock('../services/examScheduleService', () => ({
  examScheduleService: { saveSchedule },
}))

const existing: ExamSchedule = {
  id: 's1',
  packageId: 'p1',
  packageTitle: 'UTS',
  classroomId: 'c1',
  classroomName: 'VII A',
  semesterId: 'sem',
  eventId: null,
  activityId: null,
  category: 'EXAM',
  minSubmitMinutes: 0,
  type: 'DAILY',
  startsAt: toInstant('2026-11-02', '08:00'),
  endsAt: toInstant('2026-11-02', '11:00'),
  durationMinutes: 90,
  status: 'SCHEDULED',
  kind: 'REGULAR' as const,
  makeupOfId: null,
  hasSessions: false,
  createdById: 'u1',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
}

function filled() {
  const form = useScheduleForm({ mode: 'create' })
  form.packageId.value = 'p1'
  form.classroomId.value = 'c1'
  form.type.value = 'MIDTERM'
  form.startDate.value = '2026-11-02'
  form.endDate.value = '2026-11-02'
  form.startTime.value = '08:00'
  form.endTime.value = '11:00'
  form.durationMinutes.value = 90
  return form
}

describe('useScheduleForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('needs a package and a classroom to create', () => {
    const form = filled()
    expect(form.problem.value).toBeNull()

    form.packageId.value = ''
    expect(form.problem.value).toBe('Pilih paket')

    form.packageId.value = 'p1'
    form.classroomId.value = ''
    expect(form.problem.value).toBe('Pilih kelas')
  })

  it('needs an exam type to create', () => {
    const form = filled()
    form.type.value = ''

    expect(form.problem.value).toBe('Pilih jenis ujian')
  })

  it('clears the classroom when the package changes', () => {
    const form = filled()

    form.packageId.value = 'p2'

    expect(form.classroomId.value).toBe('')
  })

  it('reports the first problem of the time fields', () => {
    const form = filled()
    form.endTime.value = '07:00'

    expect(form.problem.value).toBe('Jam selesai harus setelah jam mulai')
  })

  it('sends the window as UTC instants on create', async () => {
    saveSchedule.mockResolvedValue({ success: true, data: existing })
    const form = filled()

    const saved = await form.submit()

    expect(saved?.id).toBe('s1')
    expect(saveSchedule).toHaveBeenCalledWith(
      { mode: 'create' },
      {
        packageId: 'p1',
        classroomId: 'c1',
        type: 'MIDTERM',
        startsAt: toInstant('2026-11-02', '08:00'),
        endsAt: toInstant('2026-11-02', '11:00'),
        durationMinutes: 90,
      },
    )
  })

  it('sends a cross-day window with a two-day difference', async () => {
    saveSchedule.mockResolvedValue({ success: true, data: existing })
    const form = filled()
    form.endDate.value = '2026-11-04'

    expect(form.multiDay).toBe(true)
    expect(form.problem.value).toBeNull()
    await form.submit()

    expect(saveSchedule).toHaveBeenCalledWith(
      { mode: 'create' },
      expect.objectContaining({
        startsAt: toInstant('2026-11-02', '08:00'),
        endsAt: toInstant('2026-11-04', '11:00'),
      }),
    )
  })

  it('starts from the schedule when editing and sends only the window', async () => {
    saveSchedule.mockResolvedValue({ success: true, data: existing })
    const form = useScheduleForm({ mode: 'edit', schedule: existing })

    expect(form.startDate.value).toBe('2026-11-02')
    expect(form.endDate.value).toBe('2026-11-02')
    expect(form.startTime.value).toBe('08:00')
    expect(form.endTime.value).toBe('11:00')
    expect(form.durationMinutes.value).toBe(90)
    expect(form.type.value).toBe('DAILY')
    expect(form.problem.value).toBeNull()

    form.durationMinutes.value = 120
    form.type.value = 'FINAL'
    await form.submit()

    expect(saveSchedule).toHaveBeenCalledWith(
      { mode: 'edit', id: 's1' },
      {
        type: 'FINAL',
        startsAt: toInstant('2026-11-02', '08:00'),
        endsAt: toInstant('2026-11-02', '11:00'),
        durationMinutes: 120,
        eventId: null,
      },
    )
  })

  it('attaches the event it was opened with and clears it with null', async () => {
    saveSchedule.mockResolvedValue({ success: true, data: existing })
    const attached = useScheduleForm({
      mode: 'edit',
      schedule: { ...existing, eventId: 'e1' },
    })

    expect(attached.eventId.value).toBe('e1')
    await attached.submit()
    expect(saveSchedule.mock.calls[0][1]).toMatchObject({ eventId: 'e1' })

    const detached = useScheduleForm({
      mode: 'edit',
      schedule: { ...existing, eventId: 'e1' },
    })
    detached.eventId.value = ''
    await detached.submit()

    expect(saveSchedule.mock.calls[1][1]).toHaveProperty('eventId', null)
  })

  it('omits the event entirely when a new schedule has none', async () => {
    saveSchedule.mockResolvedValue({ success: true, data: existing })
    const form = filled()

    await form.submit()

    expect(saveSchedule.mock.calls[0][1]).not.toHaveProperty('eventId')
  })

  it('keeps the type of a schedule that already has sessions', async () => {
    saveSchedule.mockResolvedValue({ success: true, data: existing })
    const form = useScheduleForm({
      mode: 'edit',
      schedule: { ...existing, hasSessions: true },
    })

    expect(form.typeLocked).toBe(true)

    form.type.value = 'FINAL'
    await form.submit()

    expect(saveSchedule).toHaveBeenCalledWith(
      { mode: 'edit', id: 's1' },
      expect.objectContaining({ type: 'DAILY' }),
    )
  })

  it('does not call the server while there is a problem', async () => {
    const form = filled()
    form.durationMinutes.value = 500

    expect(await form.submit()).toBeNull()
    expect(saveSchedule).not.toHaveBeenCalled()
  })

  it('keeps the server message when saving fails', async () => {
    saveSchedule.mockResolvedValue({
      success: false,
      error: 'Kelas bukan kelas tahun ajaran aktif',
    })
    const form = filled()

    expect(await form.submit()).toBeNull()
    expect(form.error.value).toBe('Kelas bukan kelas tahun ajaran aktif')
    expect(form.saving.value).toBe(false)
  })

  it('edits a window that runs over more than one day', () => {
    const form = useScheduleForm({
      mode: 'edit',
      schedule: {
        ...existing,
        endsAt: toInstant('2026-11-04', '12:00'),
      },
    })

    expect(form.multiDay).toBe(true)
    expect(form.endDate.value).toBe('2026-11-04')
    expect(form.problem.value).toBeNull()
  })

  it('treats a single-day window as editable', () => {
    const form = useScheduleForm({ mode: 'edit', schedule: existing })

    expect(form.multiDay).toBe(false)
    expect(form.endDate.value).toBe('2026-11-02')
    expect(form.problem.value).toBeNull()
  })

  it('locks the type of a makeup even before anyone started it', () => {
    const form = useScheduleForm({
      mode: 'edit',
      schedule: {
        ...existing,
        kind: 'MAKEUP',
        makeupOfId: 's0',
        hasSessions: false,
      },
    })

    expect(form.typeLocked).toBe(true)
  })
})
