import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import en from './locales/en'

export const SUPPORTED_LOCALES = ['en', 'id'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

const STORAGE_KEY = 'app.locale'

function isSupported(value: string | null | undefined): value is Locale {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  )
}

function stored(): Locale | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isSupported(value) ? value : null
  } catch {
    return null
  }
}

function fromBrowser(): Locale | null {
  const candidates =
    typeof navigator === 'undefined' ? [] : (navigator.languages ?? [])
  for (const tag of candidates) {
    const base = tag.split('-')[0]
    if (isSupported(base)) return base
  }
  return null
}

export function initialLocale(): Locale {
  return stored() ?? fromBrowser() ?? DEFAULT_LOCALE
}

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: { en } as Record<Locale, typeof en>,
})

const loaders: Record<Locale, () => Promise<{ default: typeof en }>> = {
  en: () => import('./locales/en'),
  id: () => import('./locales/id'),
}

export async function setLocale(locale: Locale, remember = true) {
  if (!i18n.global.availableLocales.includes(locale)) {
    const messages = await loaders[locale]()
    i18n.global.setLocaleMessage(locale, messages.default)
  }

  i18n.global.locale.value = locale
  document.documentElement.setAttribute('lang', locale)

  if (remember) {
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      return nextTick()
    }
  }

  return nextTick()
}
