import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEventForm } from './useEventForm'
import { toInstant } from '@/features/exam-schedule/utils/instant'
import type { ExamEvent } from '../types'

const { saveEvent } = vi.hoisted(() => ({ saveEvent: vi.fn() }))

const sentPayload = (index: number): Record<string, unknown> =>
  (saveEvent.mock.calls as unknown as [unknown, Record<string, unknown>][])[
    index
  ]?.[1] ?? {}
vi.mock('../services/examEventService', () => ({
  examEventService: { saveEvent },
}))

const existing: ExamEvent = {
  id: 'e1',
  semesterId: 'sem-1',
  name: 'UTS Ganjil',
  type: 'UTS',
  startsAt: toInstant('2026-11-02', '08:00'),
  endsAt: toInstant('2026-11-06', '12:00'),
  lateToleranceMinutes: 30,
  minSubmitMinutes: 20,
  requireAndroidApp: true,
  status: 'DRAFT',
}

function filled() {
  const form = useEventForm({ mode: 'create', semesterId: 'sem-1' })
  form.name.value = 'UAS Ganjil'
  form.type.value = 'UAS'
  form.startDate.value = '2026-12-01'
  form.startTime.value = '08:00'
  form.endDate.value = '2026-12-05'
  form.endTime.value = '12:00'
  form.lateToleranceMinutes.value = 30
  form.minSubmitMinutes.value = 20
  return form
}

describe('useEventForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('needs a name and a type', () => {
    const form = filled()
    expect(form.problem.value).toBeNull()

    form.name.value = '  '
    expect(form.problem.value).toBe('Nama kegiatan wajib diisi')

    form.name.value = 'UAS Ganjil'
    form.type.value = ''
    expect(form.problem.value).toBe('Pilih jenis ujian')
  })

  it('rejects an end before the start', () => {
    const form = filled()
    form.endDate.value = '2026-12-01'
    form.endTime.value = '07:00'

    expect(form.problem.value).toBe('Waktu selesai harus setelah waktu mulai')
  })

  it('rejects a negative lateness tolerance', () => {
    const form = filled()
    form.lateToleranceMinutes.value = -1

    expect(form.problem.value).toBe('Toleransi keterlambatan minimal 0 menit')
  })

  it('sends the window and the semester on create', async () => {
    saveEvent.mockResolvedValue({ success: true, data: existing })
    const form = filled()

    const saved = await form.submit()

    expect(saved?.id).toBe('e1')
    expect(saveEvent).toHaveBeenCalledWith(
      { mode: 'create' },
      {
        semesterId: 'sem-1',
        name: 'UAS Ganjil',
        type: 'UAS',
        startsAt: toInstant('2026-12-01', '08:00'),
        endsAt: toInstant('2026-12-05', '12:00'),
        lateToleranceMinutes: 30,
        minSubmitMinutes: 20,
        requireAndroidApp: true,
      },
    )
  })

  it('sends only the keys UpdateExamEventDto accepts when editing', async () => {
    saveEvent.mockResolvedValue({ success: true, data: existing })
    const form = useEventForm({ mode: 'edit', event: existing })

    expect(form.name.value).toBe('UTS Ganjil')
    expect(form.startDate.value).toBe('2026-11-02')
    expect(form.endDate.value).toBe('2026-11-06')
    expect(form.problem.value).toBeNull()

    await form.submit()

    const payload = sentPayload(0)
    expect(Object.keys(payload).sort()).toEqual([
      'endsAt',
      'lateToleranceMinutes',
      'minSubmitMinutes',
      'name',
      'requireAndroidApp',
      'startsAt',
      'status',
    ])
    expect(payload).not.toHaveProperty('semesterId')
    expect(payload).not.toHaveProperty('type')
  })

  it('sends the chosen status so an event can be activated', async () => {
    saveEvent.mockResolvedValue({ success: true, data: existing })
    const form = useEventForm({ mode: 'edit', event: existing })

    form.status.value = 'ACTIVE'
    await form.submit()

    expect(sentPayload(0).status).toBe('ACTIVE')
  })

  it('surfaces the server error instead of saving', async () => {
    saveEvent.mockResolvedValue({ success: false, error: 'Nama sudah dipakai' })
    const form = filled()

    expect(await form.submit()).toBeNull()
    expect(form.error.value).toBe('Nama sudah dipakai')
  })
})
