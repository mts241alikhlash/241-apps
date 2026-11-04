import { describe, expect, it } from 'vitest'
import { formatAttachmentName } from './attachment-name'

describe('formatAttachmentName', () => {
  it('joins document, name and extension', () => {
    expect(formatAttachmentName('Kartu Keluarga', 'Ahmad Fauzi', 'pdf')).toBe(
      'Kartu Keluarga - Ahmad Fauzi.pdf',
    )
  })

  it('accepts an extension with a leading dot', () => {
    expect(formatAttachmentName('Ijazah', 'Budi', '.JPG')).toBe(
      'Ijazah - Budi.jpg',
    )
  })

  it('removes path separators and collapses spaces', () => {
    expect(
      formatAttachmentName('Akta/Lahir', '  Siti   R\\ahma  ', 'pdf'),
    ).toBe('Akta Lahir - Siti R ahma.pdf')
  })

  it('omits the extension when empty', () => {
    expect(formatAttachmentName('Foto', 'Budi', '')).toBe('Foto - Budi')
  })
})
