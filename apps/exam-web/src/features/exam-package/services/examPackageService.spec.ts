import { beforeEach, describe, expect, it, vi } from 'vitest'
import { examPackageService } from './examPackageService'

const { createPackage, renamePackage, getPackage, getPackages, error } =
  vi.hoisted(() => ({
    createPackage: vi.fn(),
    renamePackage: vi.fn(),
    getPackage: vi.fn(),
    getPackages: vi.fn(),
    error: vi.fn(),
  }))
vi.mock('../api/examPackageApi', () => ({
  examPackageApi: { createPackage, renamePackage, getPackage, getPackages },
}))
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error } }))

const refused = (status: number, message: string) => ({
  isAxiosError: true,
  response: { status, data: { statusCode: status, message, data: null } },
})

describe('examPackageService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('hands the server message of a refused rename to the caller', async () => {
    renamePackage.mockRejectedValue(
      refused(409, 'Paket berstatus LOCKED dan tidak bisa diubah'),
    )

    const result = await examPackageService.rename('p1', 'UAS')

    expect(result).toEqual({
      success: false,
      error: 'Paket berstatus LOCKED dan tidak bisa diubah',
      status: 409,
    })
  })

  it('returns the package a change leaves behind', async () => {
    createPackage.mockResolvedValue({ data: { data: { id: 'p9' } } })

    const result = await examPackageService.create({
      title: 'UTS',
      subjectId: 's1',
      gradeId: 'g1',
    })

    expect(result).toEqual({ success: true, data: { id: 'p9' } })
  })

  it('merges the approved and the scheduled packages of a subject and grade by title', async () => {
    getPackages.mockImplementation(({ status }: { status: string }) =>
      Promise.resolve({
        data: {
          data:
            status === 'APPROVED'
              ? [{ id: 'a', title: 'UAS' }]
              : [{ id: 'b', title: 'Bank' }],
        },
      }),
    )

    const sources = await examPackageService.loadApprovedSources('s1', 'g1')

    expect(sources.map((row) => row.id)).toEqual(['b', 'a'])
    expect(getPackages).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectId: 's1',
        gradeId: 'g1',
        status: 'LOCKED',
      }),
    )
  })

  it('shows the server message when a copy or delete is refused', async () => {
    const { examPackageApi } = await import('../api/examPackageApi')
    Object.assign(examPackageApi, {
      copyPackage: vi
        .fn()
        .mockRejectedValue(refused(404, 'Paket tidak ditemukan')),
      deletePackage: vi
        .fn()
        .mockRejectedValue(
          refused(409, 'Paket yang sudah dijadwalkan tidak bisa dihapus'),
        ),
    })

    await examPackageService.copyPackage('p1')
    await examPackageService.deletePackage('p1')

    expect(error).toHaveBeenNthCalledWith(1, 'Paket tidak ditemukan')
    expect(error).toHaveBeenNthCalledWith(
      2,
      'Paket yang sudah dijadwalkan tidak bisa dihapus',
    )
  })

  it('answers null without a toast for a package that does not exist', async () => {
    getPackage.mockRejectedValue(refused(404, 'Paket tidak ditemukan'))

    expect(await examPackageService.loadPackage('p1')).toBeNull()
    expect(error).not.toHaveBeenCalled()
  })

  it('treats an id the server rejects as malformed like a missing package', async () => {
    getPackage.mockRejectedValue(
      refused(400, 'Validation failed (uuid is expected)'),
    )

    expect(await examPackageService.loadPackage('abc')).toBeNull()
    expect(error).not.toHaveBeenCalled()
  })

  it('shows a toast and throws when the package cannot be loaded', async () => {
    getPackage.mockRejectedValue(refused(503, 'academic down'))

    await expect(examPackageService.loadPackage('p1')).rejects.toBeDefined()
    expect(error).toHaveBeenCalledTimes(1)
  })
})
