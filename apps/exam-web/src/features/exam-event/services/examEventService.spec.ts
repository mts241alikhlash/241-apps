import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceRequestError } from '@mts241alikhlash/web-shared/utils/service-client'

const { generateSeats, generateSupervisorSlots } = vi.hoisted(() => ({
  generateSeats: vi.fn(),
  generateSupervisorSlots: vi.fn(),
}))
vi.mock('../api/examEventApi', () => ({
  examEventApi: { generateSeats, generateSupervisorSlots },
}))

import { examEventService } from './examEventService'

const body = {
  mode: 'preview' as const,
  students: [{ studentId: 's1', classroomId: 'c1' }],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('examEventService.generateSeats', () => {
  it('returns the planned seats', async () => {
    const data = { applied: false, rooms: [], seats: [] }
    generateSeats.mockResolvedValue(data)

    const result = await examEventService.generateSeats('e1', body)

    expect(generateSeats).toHaveBeenCalledWith('e1', body)
    expect(result).toEqual({ success: true, data })
  })

  it('maps a failure to an error outcome', async () => {
    generateSeats.mockRejectedValue(new Error('Kursi gagal dibuat.'))

    const result = await examEventService.generateSeats('e1', body)

    expect(result).toEqual({ success: false, error: expect.any(String) })
  })

  it('keeps the SEATS_EXIST code from the error body', async () => {
    generateSeats.mockRejectedValue(
      new ServiceRequestError(409, {
        code: 'SEATS_EXIST',
        message: 'Kursi periode ini sudah ada. Konfirmasi untuk menimpa.',
      }),
    )

    const result = await examEventService.generateSeats('e1', body)

    expect(result).toEqual({
      success: false,
      error: 'Kursi periode ini sudah ada. Konfirmasi untuk menimpa.',
      code: 'SEATS_EXIST',
    })
  })
})

describe('examEventService.generateSupervisorSlots', () => {
  it('returns the created and skipped counts', async () => {
    generateSupervisorSlots.mockResolvedValue({ created: 3, skipped: 0 })

    const result = await examEventService.generateSupervisorSlots('e1')

    expect(generateSupervisorSlots).toHaveBeenCalledWith('e1')
    expect(result).toEqual({
      success: true,
      data: { created: 3, skipped: 0 },
    })
  })

  it('maps a failure to an error outcome', async () => {
    generateSupervisorSlots.mockRejectedValue(new Error('x'))

    const result = await examEventService.generateSupervisorSlots('e1')

    expect(result).toEqual({ success: false, error: expect.any(String) })
  })
})
