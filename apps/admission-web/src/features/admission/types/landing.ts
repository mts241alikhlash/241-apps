export type LandingImagePurpose = 'poster' | 'photo'

export type LandingImageRef = { imageId: string } | { src: string }

export const LANDING_SECTION_KEYS = [
  'hero',
  'life',
  'info',
  'steps',
  'faq',
  'stories',
  'closing',
] as const

export type LandingSectionKey = (typeof LANDING_SECTION_KEYS)[number]

export interface LandingHeroContent {
  eyebrow: string
  titleLines: string[]
  description: string
  registerLabel: string
  guideLabel: string
  exploreLabel: string
  photoNoteLines: string[]
  schoolPhoto: { image: LandingImageRef; alt: string; caption: string }
  studyPhoto: {
    image: LandingImageRef
    alt: string
    title: string
    tag: string
  }
}

export interface LandingLifePhoto {
  image: LandingImageRef
  alt: string
  title: string
  caption: string
}

export interface LandingLifeContent {
  label: string
  titleLines: string[]
  description: string
  footnote: string
  linkLabel: string
  photos: LandingLifePhoto[]
}

export interface LandingPoster {
  image: LandingImageRef
  alt: string
  caption: string | null
}

export interface LandingInfoContent {
  title: string
  description: string
  posters: LandingPoster[]
}

export interface LandingStepsContent {
  title: string
  description: string
  items: { title: string; description: string }[]
}

export interface LandingFaqContent {
  title: string
  description: string
  items: { question: string; answer: string }[]
}

export interface LandingStoryContent {
  kind: string
  quote: string
  name: string
  position: string | null
  tags: string[]
  photo: LandingImageRef | null
  placeholder?: boolean
}

export interface LandingStoriesContent {
  label: string
  title: string
  description: string
  items: LandingStoryContent[]
}

export interface LandingClosingContent {
  title: string
  description: string
  registerLabel: string
  requirementsLabel: string
  photo: { image: LandingImageRef; alt: string }
}

export interface LandingContent {
  hero: LandingHeroContent
  life: LandingLifeContent
  info: LandingInfoContent
  steps: LandingStepsContent
  faq: LandingFaqContent
  stories: LandingStoriesContent
  closing: LandingClosingContent
}

export type LandingPublished = {
  [Key in LandingSectionKey]: LandingContent[Key] | null
}

export interface LandingDraftOverview {
  sections: LandingPublished
  hasUnpublishedChanges: boolean
  publishedAt: string | null
}
