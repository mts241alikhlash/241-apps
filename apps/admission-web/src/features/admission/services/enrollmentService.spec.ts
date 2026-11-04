import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { admissionApi } from '../api/admissionApi'
import { enrollmentService } from './enrollmentService'

vi.mock('../api/admissionApi', () => ({
  admissionApi: {
    getEnrollmentQueue: vi.fn(),
    getNisPreview: vi.fn(),
    composeNis: vi.fn(),
    lockNis: vi.fn(),
    processEnrollments: vi.fn(),
    setPlacement: vi.fn(),
  },
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function failure(status: number, message: string) {
  return { isAxiosError: true, response: { status, data: { message } } }
}

describe('enrollmentService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads a tab with its counts and school years', async () => {
    vi.mocked(admissionApi.getEnrollmentQueue).mockResolvedValue({
      data: {
        data: [{ applicationId: 'a' }],
        meta: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
          counts: { ready: 1, held: 2, done: 3 },
          years: [
            {
              academicYearId: 'y1',
              academicYearName: '2026/2027',
              locked: false,
              lockedAt: null,
            },
          ],
        },
      },
    } as never)

    const result = await enrollmentService.fetchQueue({
      tab: 'ready',
      page: 1,
      limit: 50,
    })

    expect(admissionApi.getEnrollmentQueue).toHaveBeenCalledWith({
      tab: 'ready',
      page: 1,
      limit: 50,
    })
    expect(result).toEqual({
      rows: [{ applicationId: 'a' }],
      total: 1,
      counts: { ready: 1, held: 2, done: 3 },
      years: [
        {
          academicYearId: 'y1',
          academicYearName: '2026/2027',
          locked: false,
          lockedAt: null,
        },
      ],
    })
  })

  it('returns the load error', async () => {
    vi.mocked(admissionApi.getEnrollmentQueue).mockRejectedValue(
      Object.assign(new Error('offline'), { isAxiosError: true }),
    )

    await expect(
      enrollmentService.fetchQueue({ tab: 'ready', page: 1, limit: 50 }),
    ).resolves.toHaveProperty('error')
  })

  it('loads the NIS preview or its error', async () => {
    vi.mocked(admissionApi.getNisPreview).mockResolvedValueOnce({
      data: { data: { academicYearId: 'y1', changes: 2 } },
    } as never)
    vi.mocked(admissionApi.getNisPreview).mockRejectedValueOnce(
      failure(409, 'Nama tahun ajaran tidak bisa dibaca untuk NIS'),
    )

    await expect(enrollmentService.previewNis('y1')).resolves.toEqual({
      preview: { academicYearId: 'y1', changes: 2 },
    })
    await expect(enrollmentService.previewNis('y1')).resolves.toEqual({
      error: 'Nama tahun ajaran tidak bisa dibaca untuk NIS',
    })
  })

  it('composes with the confirmed count and reports what happened', async () => {
    vi.mocked(admissionApi.composeNis).mockResolvedValue({
      data: {
        data: {
          academicYearId: 'y1',
          written: 5,
          created: 3,
          changed: 2,
          failed: [],
        },
      },
    } as never)

    const result = await enrollmentService.composeNis('y1', 2)

    expect(admissionApi.composeNis).toHaveBeenCalledWith({
      academicYearId: 'y1',
      expectedChanges: 2,
      syncStudents: undefined,
    })
    expect(result).toEqual({
      success: true,
      result: {
        academicYearId: 'y1',
        written: 5,
        created: 3,
        changed: 2,
        failed: [],
      },
    })
    expect(toast.success).toHaveBeenCalledWith(
      'NIS disusun: 3 baru, 2 berubah.',
    )
  })

  it('warns about students whose NIS could not be updated', async () => {
    vi.mocked(admissionApi.composeNis).mockResolvedValue({
      data: {
        data: {
          academicYearId: 'y1',
          written: 1,
          created: 0,
          changed: 1,
          failed: [
            {
              applicationId: 'a',
              reason: 'Gagal memperbarui NIS di data santri',
            },
          ],
        },
      },
    } as never)

    await enrollmentService.composeNis('y1', 1, true)

    expect(toast.error).toHaveBeenCalledWith(
      '1 santri belum diperbarui NIS-nya. Jalankan sinkronisasi ulang.',
    )
  })

  it('tells a stale preview from other failures', async () => {
    vi.mocked(admissionApi.composeNis).mockRejectedValue(
      failure(409, 'Hasil susun NIS berubah, lihat pratinjau lagi'),
    )

    await expect(enrollmentService.composeNis('y1', 2)).resolves.toEqual({
      success: false,
      stale: true,
    })
    expect(toast.error).toHaveBeenCalledWith(
      'Hasil susun NIS berubah, lihat pratinjau lagi',
    )
  })

  it('locks a year', async () => {
    vi.mocked(admissionApi.lockNis).mockResolvedValue({} as never)

    await expect(enrollmentService.lockNis('y1')).resolves.toEqual({
      success: true,
    })
    expect(admissionApi.lockNis).toHaveBeenCalledWith('y1')
    expect(toast.success).toHaveBeenCalledWith('NIS dikunci.')
  })

  it('processes the selected applicants and splits the outcomes', async () => {
    vi.mocked(admissionApi.processEnrollments).mockResolvedValue({
      data: {
        data: {
          results: [
            { applicationId: 'a', outcome: 'ENROLLED' },
            {
              applicationId: 'b',
              outcome: 'SKIPPED',
              reason: 'NIS belum disusun',
            },
            {
              applicationId: 'c',
              outcome: 'FAILED',
              reason: 'Duplicate NIS or NISN',
            },
          ],
        },
      },
    } as never)

    const result = await enrollmentService.process(
      ['a', 'b', 'c'],
      [{ applicationId: 'b', nisn: '0099999999' }],
    )

    expect(admissionApi.processEnrollments).toHaveBeenCalledWith({
      applicationIds: ['a', 'b', 'c'],
      nisn: [{ applicationId: 'b', nisn: '0099999999' }],
    })
    expect(result).toEqual({
      success: true,
      enrolled: 1,
      problems: [
        { applicationId: 'b', outcome: 'SKIPPED', reason: 'NIS belum disusun' },
        {
          applicationId: 'c',
          outcome: 'FAILED',
          reason: 'Duplicate NIS or NISN',
        },
      ],
    })
    expect(toast.success).toHaveBeenCalledWith('1 diproses, 2 bermasalah.')
  })

  it('shows the server message when processing is refused', async () => {
    vi.mocked(admissionApi.processEnrollments).mockRejectedValue(
      failure(400, 'Pilih 1 sampai 50 pendaftar'),
    )

    await expect(enrollmentService.process(['a'], [])).resolves.toEqual({
      success: false,
    })
    expect(toast.error).toHaveBeenCalledWith('Pilih 1 sampai 50 pendaftar')
  })

  it('sets the placement of an applicant', async () => {
    vi.mocked(admissionApi.setPlacement).mockResolvedValue({} as never)

    await expect(
      enrollmentService.setPlacement('a', 'TRANSFER', 'g8'),
    ).resolves.toEqual({
      success: true,
    })
    expect(admissionApi.setPlacement).toHaveBeenCalledWith('a', {
      admissionType: 'TRANSFER',
      targetGradeId: 'g8',
    })
    expect(toast.success).toHaveBeenCalledWith(
      'Jenis dan tingkat kelas disimpan.',
    )
  })
})
