import { describe, expect, it } from 'vitest'
import {
  participantStatusLabel,
  phaseLabel,
  reasonLabel,
  refusalLabel,
  phaseTone,
  scheduleStatusLabel,
  sessionStatusLabel,
} from './labels'

describe('schedule labels', () => {
  it('names the schedule statuses in Indonesian', () => {
    expect(scheduleStatusLabel('SCHEDULED')).toBe('Terjadwal')
    expect(scheduleStatusLabel('CANCELLED')).toBe('Dibatalkan')
  })

  it('names every phase', () => {
    expect(phaseLabel('CANCELLED')).toBe('Dibatalkan')
    expect(phaseLabel('UPCOMING')).toBe('Belum mulai')
    expect(phaseLabel('RUNNING')).toBe('Berlangsung')
    expect(phaseLabel('ENDED')).toBe('Selesai')
  })

  it('warns for a cancelled schedule and marks a running one as success', () => {
    expect(phaseTone('CANCELLED')).toBe('warning')
    expect(phaseTone('RUNNING')).toBe('success')
    expect(phaseTone('UPCOMING')).toBe('info')
    expect(phaseTone('ENDED')).toBe('neutral')
  })

  it('names every session status', () => {
    expect(sessionStatusLabel('IN_PROGRESS')).toBe('Mengerjakan')
    expect(sessionStatusLabel('SUBMITTED')).toBe('Menunggu penilaian')
    expect(sessionStatusLabel('EXPIRED')).toBe('Waktu habis')
    expect(sessionStatusLabel('GRADED')).toBe('Selesai dinilai')
  })

  it('names the reasons a student missed an exam', () => {
    expect(reasonLabel('SICK')).toBe('Sakit')
    expect(reasonLabel('PERMITTED')).toBe('Izin')
    expect(reasonLabel('ABSENT')).toBe('Tanpa keterangan')
    expect(reasonLabel('OTHER')).toBe('Lainnya')
  })

  it('says why a student cannot join a makeup', () => {
    expect(refusalLabel('ALREADY_SAT')).toBe('Sudah mengikuti ujian')
    expect(refusalLabel('IN_PROGRESS')).toBe('Sedang mengerjakan')
    expect(refusalLabel('ON_LIVE_MAKEUP')).toBe('Sudah di susulan lain')
  })

  it('names the status of a makeup participant', () => {
    expect(participantStatusLabel('WAITING')).toBe('Menunggu')
    expect(participantStatusLabel('SAT_REGULAR')).toBe('Sudah ikut ujian utama')
    expect(participantStatusLabel('IN_PROGRESS')).toBe('Mengerjakan')
    expect(participantStatusLabel('DONE')).toBe('Selesai')
  })
})
