import { describe, expect, it } from 'vitest'
import {
  cleanContent,
  emptyContent,
  hasContent,
  validateDraft,
} from './questionDraft'

describe('hasContent', () => {
  it('is false for markup with nothing to show', () => {
    expect(hasContent('')).toBe(false)
    expect(hasContent('<p dir="auto"></p>')).toBe(false)
    expect(hasContent('<p>&nbsp; </p>')).toBe(false)
  })

  it('is true for text, a picture or a formula', () => {
    expect(hasContent('<p>Soal</p>')).toBe(true)
    expect(hasContent('<p><img data-file-id="f1"></p>')).toBe(true)
    expect(hasContent('<p><span data-latex="x">x</span></p>')).toBe(true)
  })
})

describe('emptyContent', () => {
  it('starts each type in the shape the server expects', () => {
    expect(emptyContent('MULTIPLE_CHOICE')).toEqual({
      choices: [
        { key: 'A', html: '' },
        { key: 'B', html: '' },
      ],
      answer: { key: 'A' },
    })
    expect(emptyContent('MULTIPLE_RESPONSE')).toMatchObject({
      answer: { keys: [] },
    })
    expect(emptyContent('TRUE_FALSE')).toEqual({ answer: { value: true } })
    expect(emptyContent('SHORT_ANSWER')).toEqual({
      answer: { accepted: [''], ignoreCase: true, ignoreHarakat: false },
    })
    expect(emptyContent('ESSAY')).toEqual({ guideHtml: null })
  })
})

describe('validateDraft', () => {
  const body = '<p>Soal</p>'

  it('asks for a body', () => {
    expect(validateDraft('ESSAY', '<p></p>', { guideHtml: null }, 1)).toBe(
      'Isi soal wajib diisi',
    )
  })

  it('asks for filled choices and a key', () => {
    const content = emptyContent('MULTIPLE_CHOICE')
    expect(validateDraft('MULTIPLE_CHOICE', body, content, 1)).toBe(
      'Isi semua pilihan jawaban',
    )
    expect(
      validateDraft(
        'MULTIPLE_RESPONSE',
        body,
        {
          choices: [
            { key: 'A', html: '<p>1</p>' },
            { key: 'B', html: '<p>2</p>' },
          ],
          answer: { keys: [] },
        },
        1,
      ),
    ).toBe('Pilih minimal satu kunci jawaban')
  })

  it('asks for an accepted answer on a short answer', () => {
    expect(
      validateDraft('SHORT_ANSWER', body, emptyContent('SHORT_ANSWER'), 1),
    ).toBe('Isi minimal satu jawaban benar')
  })

  it('keeps points between 0.25 and 100', () => {
    const content = emptyContent('TRUE_FALSE')
    expect(validateDraft('TRUE_FALSE', body, content, 0)).toBe(
      'Poin harus antara 0,25 dan 100',
    )
    expect(validateDraft('TRUE_FALSE', body, content, 101)).toBe(
      'Poin harus antara 0,25 dan 100',
    )
    expect(validateDraft('TRUE_FALSE', body, content, 2.5)).toBeNull()
  })
})

describe('cleanContent', () => {
  it('drops blank and padded accepted answers of a short answer', () => {
    expect(
      cleanContent('SHORT_ANSWER', {
        answer: {
          accepted: [' Jakarta ', '', '  '],
          ignoreCase: true,
          ignoreHarakat: false,
        },
      }),
    ).toEqual({
      answer: {
        accepted: ['Jakarta'],
        ignoreCase: true,
        ignoreHarakat: false,
      },
    })
  })

  it('leaves the other types as they are', () => {
    const content = emptyContent('MULTIPLE_CHOICE')

    expect(cleanContent('MULTIPLE_CHOICE', content)).toBe(content)
  })
})
