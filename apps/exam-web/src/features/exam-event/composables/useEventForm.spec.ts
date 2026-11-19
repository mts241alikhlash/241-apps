import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEventForm } from './useEventForm'
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
  type: 'MIDTERM',
  category: 'EXAM',
  startsAt: '2026-11-01T17:00:00.000Z',
  endsAt: '2026-11-06T16:59:00.000Z',
  lateToleranceMinutes: 30,
  minSubmitMinutes: 20,
  status: 'DRAFT',
}

function filled() {
  const form = useEventForm({ mode: 'create', semesterId: 'sem-1' })
  form.setFieldValue('name', 'UAS Ganjil')
  form.setFieldValue('type', 'FINAL')
  form.setFieldValue('startDate', '2026-12-01')
  form.setFieldValue('endDate', '2026-12-05')
  return form
}

describe('useEventForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not save without a name', async () => {
    const form = filled()
    form.setFieldValue('name', ' ')

    await form.onSubmit()

    expect(saveEvent).not.toHaveBeenCalled()
  })

  it('does not save without an exam type', async () => {
    const form = filled()
    form.setFieldValue('type', '')

    await form.onSubmit()

    expect(saveEvent).not.toHaveBeenCalled()
  })

  it('does not save an end date before the start date', async () => {
    const form = filled()
    form.setFieldValue('endDate', '2026-11-30')

    await form.onSubmit()

    expect(saveEvent).not.toHaveBeenCalled()
  })

  it('sends the WIB day bounds and the semester on create', async () => {
    saveEvent.mockResolvedValue({ success: true, data: existing })
    const form = filled()

    expect(await form.onSubmit()).toBe(true)

    expect(saveEvent).toHaveBeenCalledWith(
      { mode: 'create' },
      {
        semesterId: 'sem-1',
        name: 'UAS Ganjil',
        type: 'FINAL',
        startsAt: '2026-12-01T00:00:00+07:00',
        endsAt: '2026-12-05T23:59:00+07:00',
      },
    )
  })

  it('sends only the keys UpdateExamEventDto accepts when editing', async () => {
    saveEvent.mockResolvedValue({ success: true, data: existing })
    const form = useEventForm({ mode: 'edit', event: existing })

    await form.onSubmit()

    const payload = sentPayload(0)
    expect(Object.keys(payload).sort()).toEqual([
      'endsAt',
      'name',
      'startsAt',
      'status',
    ])
    expect(payload.startsAt).toBe('2026-11-02T00:00:00+07:00')
    expect(payload.endsAt).toBe('2026-11-06T23:59:00+07:00')
    expect(payload).not.toHaveProperty('semesterId')
    expect(payload).not.toHaveProperty('type')
  })

  it('sends the chosen status so an event can be activated', async () => {
    saveEvent.mockResolvedValue({ success: true, data: existing })
    const form = useEventForm({ mode: 'edit', event: existing })

    form.setFieldValue('status', 'ACTIVE')
    await form.onSubmit()

    expect(sentPayload(0).status).toBe('ACTIVE')
  })

  it('surfaces the server error instead of saving', async () => {
    saveEvent.mockResolvedValue({ success: false, error: 'Nama sudah dipakai' })
    const form = filled()

    expect(await form.onSubmit()).toBe(false)
    expect(form.saveError.value).toBe('Nama sudah dipakai')
  })
})
