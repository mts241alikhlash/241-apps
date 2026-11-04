import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import en from './locales/en'
import id from './locales/id'

export const SUPPORTED_LOCALES = ['en', 'id'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'id'

const STORAGE_KEY = 'app.locale'

export function initialLocale(): Locale {
  return DEFAULT_LOCALE
}

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: { en, id },
})

export async function setLocale(locale: Locale, remember = true) {
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
