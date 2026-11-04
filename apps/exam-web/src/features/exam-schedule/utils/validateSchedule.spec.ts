import { describe, expect, it } from 'vitest'
import { validateSchedule } from './validateSchedule'

const valid = {
  date: '2026-11-02',
  startTime: '08:00',
  endTime: '11:00',
  durationMinutes: 90,
}

describe('validateSchedule', () => {
  it('accepts a duration inside the window', () => {
    expect(validateSchedule(valid)).toBeNull()
    expect(validateSchedule({ ...valid, durationMinutes: 180 })).toBeNull()
  })

  it('needs a date and both times', () => {
    expect(validateSchedule({ ...valid, date: '' })).toBe('Tanggal wajib diisi')
    expect(validateSchedule({ ...valid, startTime: '' })).toBe(
      'Jam mulai dan jam selesai wajib diisi',
    )
    expect(validateSchedule({ ...valid, endTime: '' })).toBe(
      'Jam mulai dan jam selesai wajib diisi',
    )
  })

  it('blocks an end time that is not after the start time', () => {
    expect(validateSchedule({ ...valid, endTime: '08:00' })).toBe(
      'Jam selesai harus setelah jam mulai',
    )
    expect(validateSchedule({ ...valid, endTime: '07:00' })).toBe(
      'Jam selesai harus setelah jam mulai',
    )
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
})
