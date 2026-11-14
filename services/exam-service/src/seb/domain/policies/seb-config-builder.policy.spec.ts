import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import {
  buildSebSettings,
  sebConfigKey,
  sebFile,
  sebJson,
  sebPlist,
} from './seb-config-builder.policy.js'

describe('sebJson', () => {
  it('sorts keys at every level and writes no whitespace', () => {
    expect(
      sebJson({
        zoom: 1,
        allowQuit: true,
        nested: { b: 'x', a: false },
        list: [{ y: 1, x: 2 }],
      }),
    ).toBe(
      '{"allowQuit":true,"list":[{"x":2,"y":1}],"nested":{"a":false,"b":"x"},"zoom":1}',
    )
  })

  it('leaves out originatorVersion and empty dictionaries but keeps empty arrays', () => {
    expect(
      sebJson({ originatorVersion: 'SEB_3', empty: {}, items: [], a: 1 }),
    ).toBe('{"a":1,"items":[]}')
  })

  it('does not escape slashes in URLs', () => {
    expect(sebJson({ startURL: 'https://exam.example/my-exams' })).toBe(
      '{"startURL":"https://exam.example/my-exams"}',
    )
  })
})

describe('sebConfigKey', () => {
  it('is the lowercase SHA-256 of the SEB-JSON', () => {
    const settings = {
      startURL: 'https://exam.example/my-exams',
      allowQuit: true,
    }
    expect(sebConfigKey(settings)).toBe(
      createHash('sha256').update(sebJson(settings), 'utf8').digest('hex'),
    )
    expect(sebConfigKey(settings)).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('buildSebSettings', () => {
  it('starts on the student exam list and sends the keys the server verifies', () => {
    const settings = buildSebSettings({
      startUrl: 'https://exam.example/my-exams',
    })
    expect(settings.startURL).toBe('https://exam.example/my-exams')
    expect(settings.sendBrowserExamKey).toBe(true)
    expect(settings.allowQuit).toBe(true)
    expect(settings).not.toHaveProperty('hashedQuitPassword')
  })

  it('stores a quit password only as its SHA-256 hash', () => {
    const settings = buildSebSettings({
      startUrl: 'https://exam.example/my-exams',
      quitPassword: 'rahasia123',
    })
    expect(settings.hashedQuitPassword).toBe(
      createHash('sha256').update('rahasia123', 'utf8').digest('hex'),
    )
    expect(JSON.stringify(settings)).not.toContain('rahasia123')
  })
})

describe('sebFile', () => {
  it('is gzip(plnd + gzip(plist)) carrying every setting', () => {
    const settings = buildSebSettings({
      startUrl: 'https://exam.example/my-exams?x=1&y=<2>',
    })
    const outer = gunzipSync(sebFile(settings))
    expect(outer.subarray(0, 4).toString('ascii')).toBe('plnd')
    const xml = gunzipSync(outer.subarray(4)).toString('utf8')
    expect(xml).toBe(sebPlist(settings))
    expect(xml).toContain(
      '<key>startURL</key><string>https://exam.example/my-exams?x=1&amp;y=&lt;2&gt;</string>',
    )
    expect(xml).toContain('<key>sendBrowserExamKey</key><true/>')
  })
})
