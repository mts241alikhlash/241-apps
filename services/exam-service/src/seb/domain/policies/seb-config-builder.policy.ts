import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'

export type SebValue = string | number | boolean | SebValue[] | SebSettings
export interface SebSettings {
  [key: string]: SebValue
}

export interface SebSettingsInput {
  startUrl: string
  quitPassword?: string
}

const EXCLUDED_FROM_KEY = new Set(['originatorVersion'])

const sha256 = (text: string) =>
  createHash('sha256').update(text, 'utf8').digest('hex')

export function buildSebSettings(input: SebSettingsInput): SebSettings {
  const settings: SebSettings = {
    startURL: input.startUrl,
    sendBrowserExamKey: true,
    configPurpose: 0,
    allowQuit: true,
    allowSpellCheck: false,
    allowDictionaryLookup: false,
    browserWindowAllowReload: true,
    enablePrivateClipboard: true,
    examSessionClearCookiesOnStart: false,
  }
  if (input.quitPassword) {
    settings.hashedQuitPassword = sha256(input.quitPassword)
  }
  return settings
}

const isDictionary = (value: SebValue): value is SebSettings =>
  typeof value === 'object' && !Array.isArray(value)

function jsonValue(value: SebValue): string {
  if (Array.isArray(value)) return `[${value.map(jsonValue).join(',')}]`
  if (isDictionary(value)) return jsonDictionary(value)
  if (typeof value === 'string') return `"${value.replaceAll('"', '\\"')}"`
  return String(value)
}

function jsonDictionary(settings: SebSettings): string {
  const entries = Object.keys(settings)
    .filter((key) => !EXCLUDED_FROM_KEY.has(key))
    .filter((key) => {
      const value = settings[key]
      return !(isDictionary(value) && Object.keys(value).length === 0)
    })
    .sort()
    .map((key) => `"${key}":${jsonValue(settings[key])}`)
  return `{${entries.join(',')}}`
}

export function sebJson(settings: SebSettings): string {
  return jsonDictionary(settings)
}

export function sebConfigKey(settings: SebSettings): string {
  return sha256(sebJson(settings))
}

const escapeXml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

function plistValue(value: SebValue): string {
  if (Array.isArray(value))
    return `<array>${value.map(plistValue).join('')}</array>`
  if (isDictionary(value)) return plistDictionary(value)
  if (typeof value === 'boolean') return value ? '<true/>' : '<false/>'
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? `<integer>${value}</integer>`
      : `<real>${value}</real>`
  }
  return `<string>${escapeXml(value)}</string>`
}

function plistDictionary(settings: SebSettings): string {
  const entries = Object.keys(settings)
    .sort()
    .map((key) => `<key>${escapeXml(key)}</key>${plistValue(settings[key])}`)
  return `<dict>${entries.join('')}</dict>`
}

export function sebPlist(settings: SebSettings): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
    `<plist version="1.0">${plistDictionary(settings)}</plist>\n`
  )
}

export function sebFile(settings: SebSettings): Buffer {
  const inner = gzipSync(Buffer.from(sebPlist(settings), 'utf8'))
  return gzipSync(Buffer.concat([Buffer.from('plnd', 'ascii'), inner]))
}
