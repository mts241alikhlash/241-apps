import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { SebConfig } from '../domain/entities/seb-config.entity.js'
import { FakeSebConfigRepository } from './seb-config.repository.fake.js'
import { SebVerifier } from './seb-verifier.service.js'

const PAGE = 'https://exam.example/my-exams/s1/token'
const hash = (url: string, key: string) =>
  createHash('sha256')
    .update(url + key)
    .digest('hex')

const KEY_A = 'a'.repeat(64)
const KEY_B = 'b'.repeat(64)
const KEY_OLD = 'c'.repeat(64)

function config(
  id: string,
  name: string,
  configKey: string,
  active: boolean,
): SebConfig {
  return {
    id,
    name,
    configKey,
    storageKey: `seb-configs/${id}.seb`,
    active,
    createdById: '00000000-0000-4000-8000-000000000000',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function build(configs: SebConfig[]) {
  const repo = new FakeSebConfigRepository()
  for (const c of configs) repo.configs.set(c.id, c)
  return new SebVerifier(repo, ['https://exam.example'])
}

const active = [config('1', 'Ujian A', KEY_A, true)]

describe('SebVerifier', () => {
  it.each([
    ['matching hash', PAGE, hash(PAGE, KEY_A), true],
    ['uppercase hash', PAGE, hash(PAGE, KEY_A).toUpperCase(), true],
    ['wrong hash', PAGE, hash(PAGE, KEY_B), false],
    [
      'other origin',
      'https://evil.example/my-exams/s1/token',
      hash('https://evil.example/my-exams/s1/token', KEY_A),
      false,
    ],
  ])('%s', async (_name, pageUrl, configKeyHash, expected) => {
    const verifier = build(active)
    const result = await verifier.verify({ configKeyHash, pageUrl })
    expect(result.verified).toBe(expected)
  })

  it('refuses a hash of an inactive config', async () => {
    const verifier = build([config('1', 'Lama', KEY_OLD, false)])
    const result = await verifier.verify({
      configKeyHash: hash(PAGE, KEY_OLD),
      pageUrl: PAGE,
    })
    expect(result).toEqual({ verified: false, configName: null })
  })

  it('verifies against a second active config with its name', async () => {
    const verifier = build([...active, config('2', 'Ujian B', KEY_B, true)])
    const result = await verifier.verify({
      configKeyHash: hash(PAGE, KEY_B),
      pageUrl: PAGE,
    })
    expect(result).toEqual({ verified: true, configName: 'Ujian B' })
  })

  it('ignores the fragment of the page url', async () => {
    const verifier = build(active)
    const result = await verifier.verify({
      configKeyHash: hash(PAGE, KEY_A),
      pageUrl: `${PAGE}#x`,
    })
    expect(result).toEqual({ verified: true, configName: 'Ujian A' })
  })

  it('refuses a missing proof', async () => {
    const verifier = build(active)
    expect(await verifier.verify(undefined)).toEqual({
      verified: false,
      configName: null,
    })
  })

  it('refuses a malformed url', async () => {
    const verifier = build(active)
    const result = await verifier.verify({
      configKeyHash: hash('not a url', KEY_A),
      pageUrl: 'not a url',
    })
    expect(result.verified).toBe(false)
  })
})
