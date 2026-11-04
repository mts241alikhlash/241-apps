import { describe, expect, it } from 'vitest'
import {
  markerLabel,
  markerVariant,
  packageStatusLabel,
  packageStatusTone,
  statusVariant,
} from './labels'

describe('package labels', () => {
  it('names the five statuses in Indonesian', () => {
    expect(packageStatusLabel('DRAFT')).toBe('Draf')
    expect(packageStatusLabel('SUBMITTED')).toBe('Menunggu tinjauan')
    expect(packageStatusLabel('RETURNED')).toBe('Dikembalikan')
    expect(packageStatusLabel('APPROVED')).toBe('Disetujui')
    expect(packageStatusLabel('LOCKED')).toBe('Terjadwal')
  })

  it('gives each status a tone', () => {
    expect(packageStatusTone('DRAFT')).toBe('neutral')
    expect(packageStatusTone('SUBMITTED')).toBe('info')
    expect(packageStatusTone('RETURNED')).toBe('warning')
    expect(packageStatusTone('APPROVED')).toBe('success')
    expect(packageStatusTone('LOCKED')).toBe('neutral')
  })

  it('names the question markers', () => {
    expect(markerLabel('NEW')).toBe('Baru')
    expect(markerLabel('CHANGED')).toBe('Diubah')
    expect(markerLabel('COPIED')).toBe('Salinan')
  })

  it('badges every status the same way in the list and on the page', () => {
    expect(statusVariant('DRAFT')).toBe('outline')
    expect(statusVariant('SUBMITTED')).toBe('secondary')
    expect(statusVariant('APPROVED')).toBe('default')
    expect(statusVariant('RETURNED')).toBe('destructive')
  })

  it('sets a new or changed question apart from a copied one, and never shows a change as an error', () => {
    expect(markerVariant('NEW')).toBe('default')
    expect(markerVariant('CHANGED')).toBe('default')
    expect(markerVariant('COPIED')).toBe('outline')
  })
})
