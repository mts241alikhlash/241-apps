import { ref } from 'vue'
import { admissionApi } from '../api/admissionApi'
import { landingDefaults } from '../data/landingDefaults'
import {
  LANDING_SECTION_KEYS,
  type LandingContent,
  type LandingImageRef,
  type LandingPublished,
} from '../types/landing'

export const LANDING_CONTENT_TIMEOUT_MS = 2000

export function imageUrl(image: LandingImageRef) {
  return 'imageId' in image
    ? admissionApi.landingImageUrl(image.imageId)
    : image.src
}

export function mergeLandingContent(
  sections: LandingPublished | null,
): LandingContent {
  const merged = {} as Record<string, unknown>
  for (const key of LANDING_SECTION_KEYS) {
    merged[key] = sections?.[key] ?? landingDefaults[key]
  }
  return merged as unknown as LandingContent
}

export function useLandingContent(mode: 'published' | 'draft') {
  const content = ref<LandingContent>(landingDefaults)
  const ready = ref(false)
  const error = ref(false)

  async function fetchSections() {
    if (mode === 'draft') {
      return (await admissionApi.getLandingDraft()).data.data.sections
    }
    return (await admissionApi.getLandingPublished()).data.data
  }

  async function load() {
    if (mode === 'draft') {
      try {
        content.value = mergeLandingContent(await fetchSections())
      } catch {
        error.value = true
      }
      ready.value = true
      return
    }
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), LANDING_CONTENT_TIMEOUT_MS),
    )
    const sections = await Promise.race([
      fetchSections().catch(() => null),
      timeout,
    ])
    content.value = mergeLandingContent(sections)
    ready.value = true
  }

  return { content, ready, error, load }
}
