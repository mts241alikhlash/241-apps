import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { Absentee, ExamSchedule, MakeupCreatePayload } from '../types'
import { toInstant } from '../utils/instant'
import { useMakeupForm } from './useMakeupForm'

const { loadAbsentees, createMakeup } = vi.hoisted(() => ({
  loadAbsentees: vi.fn(),
  createMakeup: vi.fn(),
}))
vi.mock('../services/examScheduleService', () => ({
  examScheduleService: { loadAbsentees, createMakeup },
}))

const original: ExamSchedule = {
  id: 's1',
  packageId: 'p1',
  packageTitle: 'UTS Matematika',
  classroomId: 'c1',
  classroomName: 'VII A',
  semesterId: 'sem',
  eventId: null,
  activityId: null,
  type: 'MIDTERM',
  kind: 'REGULAR',
  makeupOfId: null,
  startsAt: toInstant('2026-11-02', '08:00'),
  endsAt: toInstant('2026-11-02', '11:00'),
  durationMinutes: 90,
  status: 'SCHEDULED',
  hasSessions: true,
  createdById: 'u1',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
}

const rows: Absentee[] = [
  {
    studentId: 'a',
    name: 'Ani',
    nis: '1',
    eligible: true,
    reason: null,
    reportedReason: null,
    reportedNote: null,
  },
  {
    studentId: 'b',
    name: 'Budi',
    nis: '2',
    eligible: true,
    reason: null,
    reportedReason: null,
    reportedNote: null,
  },
  {
    studentId: 'c',
    name: 'Citra',
    nis: '3',
    eligible: false,
    reason: 'ALREADY_SAT',
    reportedReason: null,
    reportedNote: null,
  },
]

async function ready() {
  loadAbsentees.mockResolvedValue({ success: true, data: rows })
  const form = useMakeupForm(original)
  await form.load()
  await flushPromises()
  return form
}

describe('useMakeupForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts with the duration and package of the original and nobody chosen', async () => {
    const form = await ready()

    expect(form.durationMinutes.value).toBe(90)
    expect(form.packageId.value).toBe('p1')
    expect(form.selected.value.size).toBe(0)
    expect(form.problem.value).toBe('Pilih minimal satu siswa')
  })

  it('lets only eligible students be chosen', async () => {
    const form = await ready()

    form.toggle('a')
    form.toggle('c')

    expect([...form.selected.value]).toEqual(['a'])
    form.toggle('a')
    expect(form.selected.value.size).toBe(0)
  })

  it('selects every eligible student at once', async () => {
    const form = await ready()

    form.selectAll()

    expect([...form.selected.value].sort()).toEqual(['a', 'b'])
  })

  it('wants a window that opens after the regular exam ends', async () => {
    const form = await ready()
    form.toggle('a')
    form.date.value = '2026-11-02'
    form.startTime.value = '10:00'
    form.endTime.value = '12:00'

    expect(form.problem.value).toBe(
      'Susulan harus dimulai setelah ujian utama berakhir',
    )

    form.date.value = '2026-11-04'
    form.startTime.value = '08:00'
    form.endTime.value = '11:00'
    expect(form.problem.value).toBeNull()
  })

  it('sends the chosen students with the reason and the window', async () => {
    const form = await ready()
    form.toggle('a')
    form.toggle('b')
    form.reason.value = 'PERMITTED'
    form.date.value = '2026-11-04'
    form.startTime.value = '08:00'
    form.endTime.value = '11:00'
    createMakeup.mockResolvedValue({ success: true, data: { id: 'm1' } })

    const created = await form.submit()

    expect(created).toEqual({ id: 'm1' })
    expect(createMakeup).toHaveBeenCalledWith('s1', {
      packageId: 'p1',
      startsAt: toInstant('2026-11-04', '08:00'),
      endsAt: toInstant('2026-11-04', '11:00'),
      durationMinutes: 90,
      participants: [
        { studentId: 'a', reason: 'PERMITTED' },
        { studentId: 'b', reason: 'PERMITTED' },
      ],
    })
  })

  it('keeps the server message and does not close when the makeup is refused', async () => {
    const form = await ready()
    form.toggle('a')
    form.date.value = '2026-11-04'
    form.startTime.value = '08:00'
    form.endTime.value = '11:00'
    createMakeup.mockResolvedValue({
      success: false,
      error: 'Ani sudah terdaftar di susulan lain',
    })

    expect(await form.submit()).toBeNull()
    expect(form.error.value).toBe('Ani sudah terdaftar di susulan lain')
    expect(form.saving.value).toBe(false)
  })

  it('shows why the students could not be loaded', async () => {
    loadAbsentees.mockResolvedValue({ success: false, error: 'Gagal memuat' })
    const form = useMakeupForm(original)

    await form.load()

    expect(form.loadError.value).toBe('Gagal memuat')
    expect(form.absentees.value).toEqual([])
  })

  it('lets one student have another reason and a note while the rest follow the default', async () => {
    const form = await ready()
    form.toggle('a')
    form.toggle('b')
    form.reason.value = 'PERMITTED'
    form.setReason('a', 'SICK')
    form.setNote('a', '  Demam  ')
    form.setNote('b', '   ')
    form.date.value = '2026-11-04'
    form.startTime.value = '08:00'
    form.endTime.value = '11:00'
    createMakeup.mockResolvedValue({ success: true, data: { id: 'm1' } })

    await form.submit()

    const sent = createMakeup.mock.calls[0][1] as MakeupCreatePayload

    expect(sent.participants).toEqual([
      { studentId: 'a', reason: 'SICK', note: 'Demam' },
      { studentId: 'b', reason: 'PERMITTED' },
    ])
  })

  it('pre-fills the reason and note recorded in the room report', async () => {
    loadAbsentees.mockResolvedValue({
      success: true,
      data: [
        {
          studentId: 'a',
          name: 'Ani',
          nis: '1',
          eligible: true,
          reason: null,
          reportedReason: 'SICK',
          reportedNote: 'Demam tinggi',
        },
        {
          studentId: 'b',
          name: 'Budi',
          nis: '2',
          eligible: true,
          reason: null,
          reportedReason: null,
          reportedNote: null,
        },
      ],
    })
    const form = useMakeupForm(original)
    await form.load()
    await flushPromises()

    expect(form.reason.value).toBe('SICK')
    expect(form.reasonOf('a')).toBe('SICK')
    expect(form.notes.value.a).toBe('Demam tinggi')

    form.toggle('a')
    form.date.value = '2026-11-04'
    form.startTime.value = '08:00'
    form.endTime.value = '11:00'
    createMakeup.mockResolvedValue({ success: true, data: { id: 'm1' } })

    await form.submit()

    expect(createMakeup).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({
        participants: [
          { studentId: 'a', reason: 'SICK', note: 'Demam tinggi' },
        ],
      }),
    )
  })

  it('forgets the reason and note of a student who is unchosen', async () => {
    const form = await ready()
    form.toggle('a')
    form.setReason('a', 'ABSENT')
    form.setNote('a', 'x')
    form.toggle('a')
    form.toggle('a')

    expect(form.reasonOf('a')).toBe('SICK')
    expect(form.notes.value.a).toBeUndefined()
  })
})
