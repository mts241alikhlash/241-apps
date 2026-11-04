import { describe, expect, it } from 'vitest'
import { landingDefaults } from './data/landingDefaults'
import { LANDING_SECTIONS } from './data/landingFormConfig'
import {
  addItem,
  cloneContent,
  getAt,
  moveItem,
  removeItem,
  setAt,
  toFormContent,
  toServerContent,
  validateSection,
} from './landingForm'

const section = (key: string) =>
  LANDING_SECTIONS.find((item) => item.key === key)!

describe('LANDING_SECTIONS', () => {
  it('lists the seven sections in page order', () => {
    expect(LANDING_SECTIONS.map((item) => item.key)).toEqual([
      'hero',
      'life',
      'info',
      'steps',
      'faq',
      'stories',
      'closing',
    ])
  })

  it.each(
    LANDING_SECTIONS.map((item) => item.key).filter((key) => key !== 'stories'),
  )('accepts the built-in content of %s', (key) => {
    expect(validateSection(section(key).fields, landingDefaults[key])).toEqual(
      {},
    )
  })

  it('refuses the sample stories so they cannot go live as real testimonials', () => {
    const errors = validateSection(
      section('stories').fields,
      landingDefaults.stories,
    )
    expect(errors['items.0.name']).toBe(
      'Ini masih cerita contoh. Ganti dengan cerita nyata atau hapus.',
    )
    expect(Object.keys(errors).sort()).toEqual([
      'items.0.name',
      'items.1.name',
      'items.2.name',
    ])
  })

  it('accepts a real story, and a sample that was rewritten', () => {
    const stories = cloneContent(landingDefaults.stories)
    stories.items[0] = {
      ...stories.items[0],
      name: 'Ani Wulandari',
      quote: 'Terima kasih guru-guruku.',
    }
    stories.items = [stories.items[0]]
    expect(validateSection(section('stories').fields, stories)).toEqual({})
  })

  it('refuses a story that keeps the sample quote under a new name', () => {
    const stories = cloneContent(landingDefaults.stories)
    stories.items = [{ ...stories.items[0], name: 'Ani Wulandari' }]
    expect(
      validateSection(section('stories').fields, stories)['items.0.name'],
    ).toBe('Ini masih cerita contoh. Ganti dengan cerita nyata atau hapus.')
  })
})

describe('validateSection', () => {
  const hero = () => cloneContent(landingDefaults.hero)

  it('requires a text and names the field by path', () => {
    const values = hero()
    values.eyebrow = '   '
    expect(validateSection(section('hero').fields, values)).toEqual({
      eyebrow: 'Wajib diisi.',
    })
  })

  it('limits the length of a text', () => {
    const values = hero()
    values.description = 'x'.repeat(301)
    expect(validateSection(section('hero').fields, values).description).toBe(
      'Maksimal 300 karakter.',
    )
  })

  it('limits the number and length of title lines', () => {
    const values = hero()
    values.titleLines = []
    expect(validateSection(section('hero').fields, values).titleLines).toBe(
      'Isi minimal 1 baris.',
    )
    values.titleLines = ['a', 'b', 'c', 'd']
    expect(validateSection(section('hero').fields, values).titleLines).toBe(
      'Maksimal 3 baris.',
    )
    values.titleLines = ['x'.repeat(61)]
    expect(
      validateSection(section('hero').fields, values)['titleLines.0'],
    ).toBe('Maksimal 60 karakter.')
  })

  it('requires an image and its alt text inside a group', () => {
    const values = hero() as unknown as Record<string, unknown>
    ;(values.schoolPhoto as Record<string, unknown>).image = null
    ;(values.studyPhoto as Record<string, unknown>).alt = ''
    const errors = validateSection(section('hero').fields, values)
    expect(errors['schoolPhoto.image']).toBe('Pilih foto.')
    expect(errors['studyPhoto.alt']).toBe('Wajib diisi.')
  })

  it('enforces list sizes', () => {
    const photos = cloneContent(landingDefaults.life)
    photos.photos = []
    expect(validateSection(section('life').fields, photos).photos).toBe(
      'Isi minimal 1 foto.',
    )
    photos.photos = Array.from({ length: 13 }, () =>
      cloneContent(landingDefaults.life.photos[0]),
    )
    expect(validateSection(section('life').fields, photos).photos).toBe(
      'Maksimal 12 foto.',
    )

    const steps = cloneContent(landingDefaults.steps)
    steps.items = steps.items.slice(0, 2)
    expect(validateSection(section('steps').fields, steps).items).toBe(
      'Isi minimal 3 langkah.',
    )
    steps.items = Array.from(
      { length: 6 },
      () => steps.items[0] ?? { title: 'a', description: 'b' },
    )
    expect(validateSection(section('steps').fields, steps).items).toBe(
      'Maksimal 5 langkah.',
    )
  })

  it('allows an empty poster list and an empty story list', () => {
    expect(
      validateSection(section('info').fields, landingDefaults.info),
    ).toEqual({})
    expect(
      validateSection(section('stories').fields, {
        ...landingDefaults.stories,
        items: [],
      }),
    ).toEqual({})
  })

  it('allows a blank caption and a missing story photo', () => {
    const info = cloneContent(landingDefaults.info)
    info.posters = [{ image: { imageId: 'abc' }, alt: 'Poster', caption: '' }]
    expect(validateSection(section('info').fields, info)).toEqual({})
    const stories = cloneContent(landingDefaults.stories)
    stories.items = [
      {
        ...stories.items[0],
        name: 'Ani Wulandari',
        quote: 'Terima kasih guru-guruku.',
        photo: null,
        position: '',
      },
    ]
    expect(validateSection(section('stories').fields, stories)).toEqual({})
  })

  it('limits tags to three of at most 60 characters', () => {
    const stories = cloneContent(landingDefaults.stories)
    stories.items[0].tags = ['a', 'b', 'c', 'd']
    expect(
      validateSection(section('stories').fields, stories)['items.0.tags'],
    ).toBe('Maksimal 3 label.')
  })

  it('reports an error inside a list item by its index', () => {
    const faq = cloneContent(landingDefaults.faq)
    faq.items[2].answer = ''
    expect(validateSection(section('faq').fields, faq)).toEqual({
      'items.2.answer': 'Wajib diisi.',
    })
  })
})

describe('path helpers', () => {
  const root = { a: { list: [{ n: 1 }, { n: 2 }, { n: 3 }] } }

  it('reads nested values', () => {
    expect(getAt(root, 'a.list.1.n')).toBe(2)
    expect(getAt(root, 'a.missing.x')).toBeUndefined()
  })

  it('sets a value without touching the original', () => {
    const next = setAt(root, 'a.list.1.n', 9)
    expect(getAt(next, 'a.list.1.n')).toBe(9)
    expect(getAt(root, 'a.list.1.n')).toBe(2)
  })

  it('adds, removes and moves list items without touching the original', () => {
    expect(getAt(addItem(root, 'a.list', { n: 4 }), 'a.list')).toEqual([
      { n: 1 },
      { n: 2 },
      { n: 3 },
      { n: 4 },
    ])
    expect(getAt(removeItem(root, 'a.list', 0), 'a.list')).toEqual([
      { n: 2 },
      { n: 3 },
    ])
    expect(getAt(moveItem(root, 'a.list', 0, 1), 'a.list')).toEqual([
      { n: 2 },
      { n: 1 },
      { n: 3 },
    ])
    expect(getAt(moveItem(root, 'a.list', 2, -1), 'a.list')).toEqual([
      { n: 1 },
      { n: 3 },
      { n: 2 },
    ])
    expect(getAt(moveItem(root, 'a.list', 0, -1), 'a.list')).toEqual([
      { n: 1 },
      { n: 2 },
      { n: 3 },
    ])
    expect(getAt(moveItem(root, 'a.list', 2, 1), 'a.list')).toEqual([
      { n: 1 },
      { n: 2 },
      { n: 3 },
    ])
    expect(root.a.list).toHaveLength(3)
  })

  it('clones deeply', () => {
    const copy = cloneContent(landingDefaults.faq)
    copy.items[0].question = 'Lain'
    expect(landingDefaults.faq.items[0].question).not.toBe('Lain')
  })
})

describe('toFormContent', () => {
  it('turns a null optional text into an empty string so the input can show it', () => {
    const info = cloneContent(landingDefaults.info)
    info.posters = [{ image: { imageId: 'abc' }, alt: 'Poster', caption: null }]
    const form = toFormContent(section('info').fields, info)
    expect(form.posters[0].caption).toBe('')
    expect(validateSection(section('info').fields, form)).toEqual({})
  })

  it('round-trips with toServerContent', () => {
    const stories = cloneContent(landingDefaults.stories)
    stories.items[0].position = null
    const back = toServerContent(
      section('stories').fields,
      toFormContent(section('stories').fields, stories),
    ) as typeof stories
    expect(back.items[0].position).toBeNull()
  })

  it('leaves the original untouched', () => {
    const info = cloneContent(landingDefaults.info)
    info.posters = [{ image: { imageId: 'abc' }, alt: 'Poster', caption: null }]
    toFormContent(section('info').fields, info)
    expect(info.posters[0].caption).toBeNull()
  })
})

describe('toServerContent', () => {
  it('turns blank optional texts into null and trims', () => {
    const info = cloneContent(landingDefaults.info)
    info.posters = [
      { image: { imageId: 'abc' }, alt: ' Poster ', caption: '  ' },
    ]
    const sent = toServerContent(section('info').fields, info) as typeof info
    expect(sent.posters[0]).toEqual({
      image: { imageId: 'abc' },
      alt: 'Poster',
      caption: null,
    })
  })

  it('keeps built-in photo references, tags and lines as they are', () => {
    const sent = toServerContent(
      section('hero').fields,
      landingDefaults.hero,
    ) as typeof landingDefaults.hero
    expect(sent).toEqual(landingDefaults.hero)
  })
})
