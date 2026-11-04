import { beforeEach, describe, expect, it, vi } from 'vitest'
import { admissionApi } from '../api/admissionApi'
import { publicAdmissionService } from './publicAdmissionService'

vi.mock('../api/admissionApi', () => ({
  admissionApi: { getGrades: vi.fn() },
}))
vi.mock('@mts241alikhlash/web-shared/utils/notify-outage', () => ({
  notifyIfOutage: vi.fn(),
}))

describe('publicAdmissionService.fetchGrades', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists the grades', async () => {
    vi.mocked(admissionApi.getGrades).mockResolvedValue({
      data: { data: [{ id: 'g7', level: 7, name: 'Kelas 7' }] },
    } as never)

    await expect(publicAdmissionService.fetchGrades()).resolves.toEqual([
      { id: 'g7', level: 7, name: 'Kelas 7' },
    ])
  })

  it('answers null, not an empty list, when the grades cannot be loaded', async () => {
    vi.mocked(admissionApi.getGrades).mockRejectedValue(new Error('down'))

    await expect(publicAdmissionService.fetchGrades()).resolves.toBeNull()
  })
})
