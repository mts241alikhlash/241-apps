import { describe, expect, it } from 'vitest'
import { answerText, itemTypeLabel, publicationLabel } from './labels'

describe('grading labels', () => {
  it('names the manual question types', () => {
    expect(itemTypeLabel('ESSAY')).toBe('Uraian')
    expect(itemTypeLabel('SHORT_ANSWER')).toBe('Jawaban singkat')
  })

  it('names the state of a score publication', () => {
    expect(publicationLabel('SENT')).toBe('Terkirim ke penilaian')
    expect(publicationLabel('PENDING')).toBe('Menunggu dikirim')
    expect(publicationLabel(null)).toBe('-')
  })

  it('reads the text of an answer and nothing for other shapes', () => {
    expect(answerText({ text: 'jawab' })).toBe('jawab')
    expect(answerText({ key: 'A' })).toBe('')
    expect(answerText(null)).toBe('')
  })
})
