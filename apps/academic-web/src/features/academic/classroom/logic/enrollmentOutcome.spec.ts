import { describe, expect, it } from 'vitest'
import { enrollmentOutcome } from './enrollmentOutcome'

describe('enrollmentOutcome', () => {
  it('names every outcome the server can send', () => {
    const named = [
      'ACTIVE',
      'PROMOTED',
      'REPEATED',
      'TRANSFERRED',
      'DROPPED',
      'GRADUATED',
    ].map((status) => enrollmentOutcome(status).label)

    expect(named).toEqual([
      'Sedang Berjalan',
      'Naik Kelas',
      'Tinggal Kelas',
      'Pindah Kelas',
      'Keluar',
      'Lulus',
    ])
  })

  it('treats a note as a reason only where a decision went against the student', () => {
    expect(enrollmentOutcome('REPEATED').noteIsAReason).toBe(true)
    expect(enrollmentOutcome('DROPPED').noteIsAReason).toBe(true)

    expect(enrollmentOutcome('PROMOTED').noteIsAReason).toBe(false)
    expect(enrollmentOutcome('TRANSFERRED').noteIsAReason).toBe(false)
    expect(enrollmentOutcome('GRADUATED').noteIsAReason).toBe(false)
  })

  it('marks the year in progress apart from the ones that ended', () => {
    expect(enrollmentOutcome('ACTIVE').variant).toBe('outline')
  })

  it('shows an unrecognized status rather than hiding it', () => {
    expect(enrollmentOutcome('SOMETHING_NEW').label).toBe('SOMETHING_NEW')
  })
})
