import { describe, expect, it } from 'vitest'
import { validateSchedule } from './validateSchedule'

const valid = {
  startDate: '2026-11-02',
  startTime: '08:00',
  endDate: '2026-11-02',
  endTime: '11:00',
  durationMinutes: 90,
}

describe('validateSchedule', () => {
  it('accepts a duration inside the window', () => {
    expect(validateSchedule(valid)).toBeNull()
    expect(validateSchedule({ ...valid, durationMinutes: 180 })).toBeNull()
  })

  it('accepts a window that crosses days', () => {
    expect(
      validateSchedule({
        startDate: '2026-11-12',
        startTime: '08:00',
        endDate: '2026-11-14',
        endTime: '15:00',
        durationMinutes: 120,
      }),
    ).toBeNull()
  })

  it('needs a start date and an end date', () => {
    expect(validateSchedule({ ...valid, startDate: '' })).toBe(
      'Tanggal wajib diisi',
    )
    expect(validateSchedule({ ...valid, endDate: '' })).toBe(
      'Tanggal wajib diisi',
    )
  })

  it('needs both times', () => {
    expect(validateSchedule({ ...valid, startTime: '' })).toBe(
      'Jam mulai dan jam selesai wajib diisi',
    )
    expect(validateSchedule({ ...valid, endTime: '' })).toBe(
      'Jam mulai dan jam selesai wajib diisi',
    )
  })

  it('blocks an end that is not after the start', () => {
    expect(validateSchedule({ ...valid, endTime: '08:00' })).toBe(
      'Jam selesai harus setelah jam mulai',
    )
    expect(validateSchedule({ ...valid, endTime: '07:00' })).toBe(
      'Jam selesai harus setelah jam mulai',
    )
    expect(
      validateSchedule({ ...valid, endDate: '2026-11-01', endTime: '09:00' }),
    ).toBe('Jam selesai harus setelah jam mulai')
  })

  it('blocks a duration that is missing, fractional, zero or above 24 hours', () => {
    for (const durationMinutes of [null, 0, 1.5, 1441]) {
      expect(validateSchedule({ ...valid, durationMinutes })).toBe(
        'Durasi harus antara 1 dan 1440 menit',
      )
    }
  })

  it('blocks a duration longer than the window', () => {
    expect(validateSchedule({ ...valid, durationMinutes: 181 })).toBe(
      'Durasi tidak boleh lebih panjang dari jendela ujian',
    )
  })

  it('blocks a window longer than 14 days', () => {
    expect(
      validateSchedule({
        startDate: '2026-11-01',
        startTime: '08:00',
        endDate: '2026-11-16',
        endTime: '09:00',
        durationMinutes: 60,
      }),
    ).toBe('Jendela ujian maksimal 14 hari')
  })

  it('allows a window of exactly 14 days and blocks one minute more', () => {
    const window = {
      startDate: '2026-11-12',
      startTime: '08:00',
      durationMinutes: 60,
    }
    expect(
      validateSchedule({ ...window, endDate: '2026-11-26', endTime: '08:00' }),
    ).toBeNull()
    expect(
      validateSchedule({ ...window, endDate: '2026-11-26', endTime: '08:01' }),
    ).toBe('Jendela ujian maksimal 14 hari')
  })
})
