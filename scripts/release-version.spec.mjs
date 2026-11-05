import assert from 'node:assert/strict'
import test from 'node:test'
import { appsNeedingManifest, manifestFile } from './release-version.mjs'

const before = new Map([
  ['hr-web', '0.1.0'],
  ['portal-web', '0.1.0'],
  ['hr-service', '0.1.0'],
])

test('only apps whose version changed need a manifest', () => {
  const after = new Map([
    ['hr-web', '0.2.0'],
    ['portal-web', '0.1.0'],
    ['hr-service', '0.2.0'],
  ])
  assert.deepEqual(appsNeedingManifest(before, after), [
    { name: 'hr-web', version: '0.2.0' },
  ])
})

test('the manifest file is named after the app without the -web suffix', () => {
  assert.equal(
    manifestFile('hr-web', '0.2.0'),
    'infra/gateway/manifests/hr-0.2.0.json',
  )
})
