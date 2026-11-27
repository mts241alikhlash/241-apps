// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceRequestError } from '@mts241alikhlash/web-shared/utils/service-client'

const { api, toastError } = vi.hoisted(() => ({
  api: {
    schedules: vi.fn(),
    roster: vi.fn(),
    save: vi.fn(),
    importScores: vi.fn(),
    sheet: vi.fn(),
    publish: vi.fn(),
  },
  toastError: vi.fn(),
}))

vi.mock('../api/examOfflineApi', () => ({ examOfflineApi: api }))
vi.mock('vue-sonner', () => ({ toast: { error: toastError } }))

import { examOfflineService } from './examOfflineService'

const conflict = (code: string, message: string) =>
  new ServiceRequestError(409, { statusCode: 409, message, code })

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('examOfflineService', () => {
  it('returns the stored row after a save', async () => {
    api.save.mockResolvedValue({ studentId: 'a', rawScore: 40 })
    await expect(
      examOfflineService.save('s1', 'a', { rawScore: 40 }),
    ).resolves.toEqual({
      success: true,
      data: { studentId: 'a', rawScore: 40 },
    })
  })

  it('passes the server message and code of a refused save', async () => {
    api.save.mockRejectedValue(
      conflict(
        'OFFLINE_SCORE_PUBLISHED',
        'Nilai sudah terkirim; ganti dengan nilai baru',
      ),
    )
    await expect(
      examOfflineService.save('s1', 'a', { rawScore: null }),
    ).resolves.toEqual({
      success: false,
      error: 'Nilai sudah terkirim; ganti dengan nilai baru',
      code: 'OFFLINE_SCORE_PUBLISHED',
    })
  })

  it('tells a publish refused for missing scores apart from other failures', async () => {
    api.publish.mockRejectedValueOnce(
      conflict('OFFLINE_SCORES_MISSING', 'Belum dinilai: Budi'),
    )
    await expect(examOfflineService.publish('s1', false)).resolves.toEqual({
      success: false,
      error: 'Belum dinilai: Budi',
      missing: true,
    })
    expect(api.publish).toHaveBeenCalledWith('s1', {})

    api.publish.mockRejectedValueOnce(new Error('boom'))
    const failed = await examOfflineService.publish('s1', true)
    expect(failed).toMatchObject({ success: false, missing: false })
    expect(api.publish).toHaveBeenLastCalledWith('s1', { confirmMissing: true })
  })

  it('saves the sheet under the server file name', async () => {
    const blob = new Blob(['x'])
    api.sheet.mockResolvedValue({ blob, fileName: 'score-sheet-a.xlsx' })
    const createUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:sheet')
    const revokeUrl = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined)
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('score-sheet-a.xlsx')
        expect(this.href).toBe('blob:sheet')
      })

    await expect(examOfflineService.downloadSheet('s1')).resolves.toBe(true)

    expect(api.sheet).toHaveBeenCalledWith('s1')
    expect(createUrl).toHaveBeenCalledWith(blob)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeUrl).toHaveBeenCalledWith('blob:sheet')
  })

  it('reports a failed download', async () => {
    api.sheet.mockRejectedValue(new Error('down'))
    await expect(examOfflineService.downloadSheet('s1')).resolves.toBe(false)
    expect(toastError).toHaveBeenCalled()
  })
})
