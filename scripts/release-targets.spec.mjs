import assert from 'node:assert/strict'
import test from 'node:test'
import { selectTargets } from './release-targets.mjs'

const packages = [
  { name: 'hr-web', version: '0.2.0', dir: 'apps/hr-web' },
  { name: 'hr-service', version: '0.3.0', dir: 'services/hr-service' },
  { name: '@mts241alikhlash/ui', version: '0.1.1', dir: 'packages/ui' },
  { name: 'portal-web', version: '0.1.0', dir: 'apps/portal-web' },
]

test('a package whose tag exists is skipped', () => {
  const out = selectTargets(packages, ['portal-web@0.1.0'])
  assert.deepEqual(
    out.map((t) => t.name),
    ['hr-web', 'hr-service', '@mts241alikhlash/ui'],
  )
})

test('apps, services and libraries get their kind', () => {
  const out = selectTargets(packages, [])
  assert.deepEqual(
    out.map((t) => [t.name, t.kind]),
    [
      ['hr-web', 'app'],
      ['hr-service', 'service'],
      ['@mts241alikhlash/ui', 'library'],
      ['portal-web', 'app'],
    ],
  )
})

test('a bumped version is selected even when an older tag exists', () => {
  const out = selectTargets(packages, ['hr-service@0.2.9'])
  assert.ok(out.some((t) => t.name === 'hr-service' && t.version === '0.3.0'))
})
