import { beforeEach, describe, expect, it, vi } from 'vitest'
import { examScheduleService } from './examScheduleService'

const {
  getPackages,
  createSchedule,
  cancelSchedule,
  getAccessCode,
  rotateAccessCode,
  getSessions,
  releaseSession,
  getAbsentees,
  createMakeup,
  getParticipants,
  addParticipants,
  removeParticipant,
  error,
} = vi.hoisted(() => ({
  getPackages: vi.fn(),
  createSchedule: vi.fn(),
  cancelSchedule: vi.fn(),
  getAccessCode: vi.fn(),
  rotateAccessCode: vi.fn(),
  getSessions: vi.fn(),
  releaseSession: vi.fn(),
  getAbsentees: vi.fn(),
  createMakeup: vi.fn(),
  getParticipants: vi.fn(),
  addParticipants: vi.fn(),
  removeParticipant: vi.fn(),
  error: vi.fn(),
}))
vi.mock('../api/examScheduleApi', () => ({
  examScheduleApi: {
    createSchedule,
    cancelSchedule,
    getAccessCode,
    rotateAccessCode,
    getSessions,
    releaseSession,
    getAbsentees,
    createMakeup,
    getParticipants,
    addParticipants,
    removeParticipant,
    updateSchedule: vi.fn(),
  },
}))
vi.mock('@/features/exam-package/api/examPackageApi', () => ({
  examPackageApi: { getPackages },
}))
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error } }))

const refused = (status: number, message: string) => ({
  isAxiosError: true,
  response: { status, data: { statusCode: status, message, data: null } },
})

describe('examScheduleService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('offers only approved and already scheduled packages, sorted by title', async () => {
    getPackages.mockImplementation(({ status }: { status: string }) =>
      Promise.resolve({
        data: {
          data:
            status === 'APPROVED'
              ? [{ id: 'a', title: 'UH Bab 2' }]
              : status === 'LOCKED'
                ? [{ id: 'l', title: 'UAS Ganjil' }]
                : [{ id: 'd', title: 'Draf' }],
        },
      }),
    )

    const packages = await examScheduleService.loadPackages()

    expect(getPackages).toHaveBeenCalledTimes(2)
    expect(
      getPackages.mock.calls
        .map(([query]) => (query as { status: string }).status)
        .sort(),
    ).toEqual(['APPROVED', 'LOCKED'])
    expect(packages.map((pkg) => pkg.id)).toEqual(['l', 'a'])
  })

  it('tells the user and returns nothing when the packages cannot load', async () => {
    getPackages.mockRejectedValue(new Error('down'))

    expect(await examScheduleService.loadPackages()).toEqual([])
    expect(error).toHaveBeenCalled()
  })

  it('hands the server message of a refused schedule to the form', async () => {
    createSchedule.mockRejectedValue(
      refused(400, 'Kelas bukan kelas tahun ajaran aktif'),
    )

    const result = await examScheduleService.saveSchedule(
      { mode: 'create' },
      {
        packageId: 'p1',
        classroomId: 'c1',
        type: 'MIDTERM',
        startsAt: '2030-11-02T01:00:00.000Z',
        endsAt: '2030-11-02T04:00:00.000Z',
        durationMinutes: 90,
      },
    )

    expect(result).toEqual({
      success: false,
      error: 'Kelas bukan kelas tahun ajaran aktif',
    })
  })

  it('shows the server message when a cancel is refused', async () => {
    cancelSchedule.mockRejectedValue(refused(409, 'Jadwal sudah dibatalkan'))

    expect(await examScheduleService.cancelSchedule('s1')).toBe(false)
    expect(error).toHaveBeenCalledWith('Jadwal sudah dibatalkan')
  })

  it('hands the server message of the access code endpoints to the dialog', async () => {
    getAccessCode.mockRejectedValue(refused(409, 'Jadwal sudah dibatalkan'))
    rotateAccessCode.mockRejectedValue(refused(409, 'Jadwal sudah dibatalkan'))

    expect(await examScheduleService.loadAccessCode('s1')).toEqual({
      success: false,
      error: 'Jadwal sudah dibatalkan',
    })
    expect(await examScheduleService.rotateAccessCode('s1')).toEqual({
      success: false,
      error: 'Jadwal sudah dibatalkan',
    })
  })
})

describe('examScheduleService sessions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the sessions of a schedule', async () => {
    getSessions.mockResolvedValue({
      data: { data: [{ sessionId: 'x1' }], meta: { total: 1 } },
    })

    const result = await examScheduleService.loadSessions('s1')

    expect(result).toEqual({
      success: true,
      data: [{ sessionId: 'x1' }],
      total: 1,
    })
  })

  it('shows the server message when the sessions cannot be loaded', async () => {
    getSessions.mockRejectedValue(refused(404, 'Jadwal tidak ditemukan'))

    const result = await examScheduleService.loadSessions('s1')

    expect(result).toEqual({ success: false, error: 'Jadwal tidak ditemukan' })
  })

  it('releases a session and reports a refusal with the server message', async () => {
    releaseSession.mockResolvedValueOnce({})
    expect(
      await examScheduleService.releaseSession('x1', 'Siswa pindah perangkat'),
    ).toBe(true)

    releaseSession.mockRejectedValueOnce(
      refused(409, 'Sesi sudah selesai dan tidak bisa dilepas'),
    )
    expect(
      await examScheduleService.releaseSession('x1', 'Siswa pindah perangkat'),
    ).toBe(false)
    expect(error).toHaveBeenCalledWith(
      'Sesi sudah selesai dan tidak bisa dilepas',
    )
  })

  it('reports the real total when more sessions exist than were loaded', async () => {
    getSessions.mockResolvedValue({
      data: { data: [{ sessionId: 'x1' }], meta: { total: 1400 } },
    })

    const result = await examScheduleService.loadSessions('s1')

    expect(result).toMatchObject({ success: true, total: 1400 })
  })

  describe('examScheduleService makeups', () => {
    beforeEach(() => vi.clearAllMocks())

    const body = {
      startsAt: '2026-11-05T01:00:00.000Z',
      endsAt: '2026-11-05T04:00:00.000Z',
      durationMinutes: 90,
      participants: [{ studentId: 'st1', reason: 'SICK' as const }],
    }

    it('loads the absentees', async () => {
      getAbsentees.mockResolvedValue({
        data: { data: [{ studentId: 'st1', eligible: true }] },
      })

      expect(await examScheduleService.loadAbsentees('s1')).toEqual({
        success: true,
        data: [{ studentId: 'st1', eligible: true }],
      })
    })

    it('hands the server message of a refused makeup to the dialog', async () => {
      createMakeup.mockRejectedValue(
        refused(400, 'Budi sudah mengikuti ujian ini'),
      )

      expect(await examScheduleService.createMakeup('s1', body)).toEqual({
        success: false,
        error: 'Budi sudah mengikuti ujian ini',
      })
    })

    it('returns the created makeup', async () => {
      createMakeup.mockResolvedValue({ data: { data: { id: 'm1' } } })

      expect(await examScheduleService.createMakeup('s1', body)).toEqual({
        success: true,
        data: { id: 'm1' },
      })
    })

    it('removes a participant and reports the server reason when refused', async () => {
      removeParticipant.mockResolvedValueOnce({})
      removeParticipant.mockRejectedValueOnce(
        refused(409, 'Siswa sudah punya sesi, tidak bisa dihapus'),
      )

      expect(await examScheduleService.removeParticipant('m1', 'st1')).toEqual({
        success: true,
        data: null,
      })
      expect(await examScheduleService.removeParticipant('m1', 'st1')).toEqual({
        success: false,
        error: 'Siswa sudah punya sesi, tidak bisa dihapus',
      })
    })

    it('adds participants and loads them', async () => {
      addParticipants.mockResolvedValue({})
      getParticipants.mockResolvedValue({
        data: { data: [{ studentId: 'st1', status: 'WAITING' }] },
      })

      expect(
        await examScheduleService.addParticipants('m1', body.participants),
      ).toEqual({ success: true, data: null })
      expect(await examScheduleService.loadParticipants('m1')).toEqual({
        success: true,
        data: [{ studentId: 'st1', status: 'WAITING' }],
      })
    })
  })
})
