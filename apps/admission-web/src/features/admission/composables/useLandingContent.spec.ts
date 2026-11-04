import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { landingDefaults } from '../data/landingDefaults'
import {
  LANDING_CONTENT_TIMEOUT_MS,
  imageUrl,
  mergeLandingContent,
  useLandingContent,
} from './useLandingContent'

const api = vi.hoisted(() => ({
  getLandingPublished: vi.fn(),
  getLandingDraft: vi.fn(),
  landingImageUrl: (id: string) => `/admissions/landing/images/${id}`,
}))
vi.mock('../api/admissionApi', () => ({ admissionApi: api }))

const none = {
  hero: null,
  life: null,
  info: null,
  steps: null,
  faq: null,
  stories: null,
  closing: null,
}
const closing = { ...landingDefaults.closing, title: 'Judul baru' }

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.useRealTimers())

describe('imageUrl', () => {
  it('resolves an uploaded image to its public URL and keeps a built-in path', () => {
    expect(imageUrl({ imageId: 'abc' })).toBe('/admissions/landing/images/abc')
    expect(imageUrl({ src: '/hero/baiat.webp' })).toBe('/hero/baiat.webp')
  })
})

describe('mergeLandingContent', () => {
  it('uses the built-in content for every section that is null or missing', () => {
    expect(mergeLandingContent(null)).toEqual(landingDefaults)
    expect(mergeLandingContent(none)).toEqual(landingDefaults)
  })

  it('takes a published section over the built-in one, section by section', () => {
    const merged = mergeLandingContent({ ...none, closing })
    expect(merged.closing).toEqual(closing)
    expect(merged.hero).toEqual(landingDefaults.hero)
  })
})

describe('useLandingContent', () => {
  it('loads the published content', async () => {
    api.getLandingPublished.mockResolvedValue({
      data: { data: { ...none, closing } },
    })
    const landing = useLandingContent('published')
    expect(landing.ready.value).toBe(false)

    await landing.load()

    expect(api.getLandingPublished).toHaveBeenCalledTimes(1)
    expect(landing.content.value.closing.title).toBe('Judul baru')
    expect(landing.ready.value).toBe(true)
  })

  it('loads the draft overview in draft mode', async () => {
    api.getLandingDraft.mockResolvedValue({
      data: {
        data: {
          sections: { ...none, closing },
          hasUnpublishedChanges: true,
          publishedAt: null,
        },
      },
    })
    const landing = useLandingContent('draft')

    await landing.load()

    expect(api.getLandingDraft).toHaveBeenCalledTimes(1)
    expect(api.getLandingPublished).not.toHaveBeenCalled()
    expect(landing.content.value.closing.title).toBe('Judul baru')
  })

  it('falls back to the built-in content on an error', async () => {
    api.getLandingPublished.mockRejectedValue(new Error('down'))
    const landing = useLandingContent('published')

    await landing.load()

    expect(landing.content.value).toEqual(landingDefaults)
    expect(landing.ready.value).toBe(true)
  })

  it('reports an error instead of the built-in content when the draft cannot be loaded', async () => {
    api.getLandingDraft.mockRejectedValue(new Error('down'))
    const landing = useLandingContent('draft')

    await landing.load()

    expect(landing.error.value).toBe(true)
    expect(landing.ready.value).toBe(true)
  })

  it('waits for a slow draft instead of falling back after the timeout', async () => {
    vi.useFakeTimers()
    let answer: (value: unknown) => void = () => undefined
    api.getLandingDraft.mockReturnValue(
      new Promise((resolve) => (answer = resolve)),
    )
    const landing = useLandingContent('draft')

    const loading = landing.load()
    await vi.advanceTimersByTimeAsync(LANDING_CONTENT_TIMEOUT_MS + 1000)
    expect(landing.ready.value).toBe(false)

    answer({
      data: {
        data: {
          sections: { ...none, closing },
          hasUnpublishedChanges: true,
          publishedAt: null,
        },
      },
    })
    await loading

    expect(landing.ready.value).toBe(true)
    expect(landing.error.value).toBe(false)
    expect(landing.content.value.closing.title).toBe('Judul baru')
  })

  it('does not report an error for the public page, which falls back silently', async () => {
    api.getLandingPublished.mockRejectedValue(new Error('down'))
    const landing = useLandingContent('published')
    await landing.load()
    expect(landing.error.value).toBe(false)
  })

  it('falls back after the timeout and ignores a late answer', async () => {
    vi.useFakeTimers()
    let answer: (value: unknown) => void = () => undefined
    api.getLandingPublished.mockReturnValue(
      new Promise((resolve) => (answer = resolve)),
    )
    const landing = useLandingContent('published')

    const loading = landing.load()
    await vi.advanceTimersByTimeAsync(LANDING_CONTENT_TIMEOUT_MS)
    await loading

    expect(landing.ready.value).toBe(true)
    expect(landing.content.value).toEqual(landingDefaults)

    answer({ data: { data: { ...none, closing } } })
    await Promise.resolve()
    expect(landing.content.value).toEqual(landingDefaults)
  })
})
