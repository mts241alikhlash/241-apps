import assert from 'node:assert/strict'
import {
  latestVersion,
  manifestFileName,
  needsPin,
  pinImages,
  productionPin,
  promote,
  referencedManifests,
  remoteTags,
} from './update-lock.mjs'

assert.equal(
  latestVersion(
    ['hr-web@0.1.0', 'hr-web@1.0.0', 'hr-web@1.10.0', 'hr-web@1.9.3', 'hr-web@2.0.0-rc.1', 'hr-webx@9.0.0'],
    'hr-web',
  ),
  '1.10.0',
)
assert.equal(latestVersion(['@mts241alikhlash/hr-api@3.0.0', 'hr-service@1.0.1'], 'hr-service'), '1.0.1')
assert.equal(latestVersion(['portal-web@1.0.0'], 'hr-web'), null)

assert.equal(manifestFileName('hr', '1.0.1'), 'hr-1.0.1.json')
assert.deepEqual(
  [
    ...referencedManifests([
      { apps: { hr: { routesVersion: '1.0.1' }, portal: { routesVersion: '1.0.0' } } },
      { apps: { hr: { routesVersion: '1.0.0' }, portal: { routesVersion: '1.0.0' } } },
    ]),
  ].sort(),
  ['hr-1.0.0.json', 'hr-1.0.1.json', 'portal-1.0.0.json'],
)

const placeholder = {
  webVersion: '1.0.0',
  webImage: 'ghcr.io/mts241alikhlash/exam-web@sha256:REPLACE_BEFORE_DEPLOYMENT',
}
const released = {
  webVersion: '1.0.0',
  webImage: `ghcr.io/mts241alikhlash/exam-web@sha256:${'a'.repeat(64)}`,
}

assert.equal(needsPin(placeholder, '1.0.0'), true, 'a placeholder pin is filled on its first release')
assert.equal(needsPin(placeholder, '1.0.1'), true)
assert.equal(needsPin(released, '1.0.0'), false)
assert.equal(needsPin(released, '1.0.1'), true)
assert.equal(needsPin(released, null), false)

assert.equal(
  pinImages(
    '  exam-web:\n    image: ghcr.io/mts241alikhlash/exam-web@sha256:REPLACE_BEFORE_DEPLOYMENT\n',
    [`ghcr.io/mts241alikhlash/exam-web@sha256:${'b'.repeat(64)}`],
  ),
  `  exam-web:\n    image: ghcr.io/mts241alikhlash/exam-web@sha256:${'b'.repeat(64)}\n`,
)
assert.equal(
  pinImages(
    '  hr-web:\n    image: ghcr.io/mts241alikhlash/hr-web@sha256:' + 'c'.repeat(64) + '\n',
    [`ghcr.io/mts241alikhlash/hr-web@sha256:${'d'.repeat(64)}`],
  ),
  `  hr-web:\n    image: ghcr.io/mts241alikhlash/hr-web@sha256:${'d'.repeat(64)}\n`,
)

const stagingLock = {
  apps: {
    exam: {
      host: 'exam.localhost',
      sslHost: 'dev-exam.mts241alikhlash.sch.id',
      root: '/usr/share/nginx/html/exam',
      webVersion: '1.0.0',
      webImage: `ghcr.io/mts241alikhlash/exam-web@sha256:${'e'.repeat(64)}`,
      routesVersion: '1.0.0',
      routesSha256: 'f'.repeat(64),
    },
  },
  services: {},
}
const productionLock = { apps: {}, services: {} }
const promoteChanges = []
promote(productionLock, stagingLock, promoteChanges)
assert.deepEqual(productionLock.apps.exam, {
  host: 'exam.localhost',
  sslHost: 'exam.mts241alikhlash.sch.id',
  root: '/usr/share/nginx/html/exam',
  webVersion: '1.0.0',
  webImage: `ghcr.io/mts241alikhlash/exam-web@sha256:${'e'.repeat(64)}`,
  routesVersion: '1.0.0',
  routesSha256: 'f'.repeat(64),
})
assert.deepEqual(promoteChanges, ['exam-web 1.0.0'])
assert.deepEqual(productionPin({ sslHost: 'accounts.mts241alikhlash.sch.id' }), {
  sslHost: 'accounts.mts241alikhlash.sch.id',
})

assert.deepEqual(
  remoteTags('exam-web', () => `${'1'.repeat(40)}\trefs/tags/exam-web@1.0.0\n`),
  ['exam-web@1.0.0'],
)
assert.deepEqual(
  remoteTags('exam-web', () => {
    const error = new Error('exit 128')
    error.stderr = "remote: Repository not found.\nfatal: repository 'https://github.com/mts241alikhlash/exam-web.git/' not found"
    throw error
  }),
  [],
  'an unreleased app repo is not a failure',
)
assert.throws(
  () =>
    remoteTags('exam-web', () => {
      const error = new Error('exit 128')
      error.stderr = 'fatal: unable to access: Could not resolve host'
      throw error
    }),
  /git ls-remote exam-web failed: fatal: unable to access: Could not resolve host/,
  'a generic git failure must not read as "no tags"',
)

console.log('update-lock test passed')
