import { describe, expect, it } from 'vitest'
import { eventLabel } from './index'

describe('eventLabel', () => {
  it('names the absence gap and the call suspension', () => {
    expect(eventLabel('ABSENCE_GAP')).toBe('Hilang sementara')
    expect(eventLabel('CALL_SUSPENDED')).toBe('Ujian dijeda karena panggilan')
    expect(eventLabel('CLOSED_BY_ADMIN')).toBe('Ditutup admin')
  })

  it('falls back to the raw type when it has no label yet', () => {
    expect(eventLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW')
    expect(eventLabel(null)).toBe('Kejadian')
  })
})
