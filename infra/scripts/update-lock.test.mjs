import assert from 'node:assert/strict'
import {
  latestVersion,
  manifestFileName,
  needsPin,
  pinImages,
  referencedManifests,
  applyPins,
  gatewayTag,
  sha256Hex,
} from './update-lock.mjs'

assert.equal(
  latestVersion(
    [
      'hr-web@0.1.0',
      'hr-web@1.0.0',
      'hr-web@1.10.0',
      'hr-web@1.9.3',
      'hr-web@2.0.0-rc.1',
      'hr-webx@9.0.0',
    ],
    'hr-web',
  ),
  '1.10.0',
)
assert.equal(
  latestVersion(
    ['@mts241alikhlash/hr-api@3.0.0', 'hr-service@1.0.1'],
    'hr-service',
  ),
  '1.0.1',
)
assert.equal(latestVersion(['portal-web@1.0.0'], 'hr-web'), null)

assert.equal(manifestFileName('hr', '1.0.1'), 'hr-1.0.1.json')
assert.deepEqual(
  [
    ...referencedManifests([
      {
        apps: {
          hr: { routesVersion: '1.0.1' },
          portal: { routesVersion: '1.0.0' },
        },
      },
      {
        apps: {
          hr: { routesVersion: '1.0.0' },
          portal: { routesVersion: '1.0.0' },
        },
      },
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

assert.equal(
  needsPin(placeholder, '1.0.0'),
  true,
  'a placeholder pin is filled on its first release',
)
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
    '  hr-web:\n    image: ghcr.io/mts241alikhlash/hr-web@sha256:' +
      'c'.repeat(64) +
      '\n',
    [`ghcr.io/mts241alikhlash/hr-web@sha256:${'d'.repeat(64)}`],
  ),
  `  hr-web:\n    image: ghcr.io/mts241alikhlash/hr-web@sha256:${'d'.repeat(64)}\n`,
)

const sha = 'e'.repeat(64)
const lock = {
  schemaVersion: 1,
  gatewayImage: 'ghcr.io/mts241alikhlash/gateway@sha256:' + '0'.repeat(64),
  apps: {
    hr: {
      host: 'hr.localhost',
      webVersion: '0.1.0',
      webImage: 'ghcr.io/mts241alikhlash/hr-web@sha256:' + '1'.repeat(64),
      routesVersion: '0.1.0',
      routesSha256: '2'.repeat(64),
    },
    portal: {
      host: 'portal.localhost',
      webVersion: '0.1.0',
      webImage: 'ghcr.io/mts241alikhlash/portal-web@sha256:' + '3'.repeat(64),
      routesVersion: '0.1.0',
      routesSha256: '4'.repeat(64),
    },
  },
  services: {
    hr: {
      version: '0.1.0',
      image: 'ghcr.io/mts241alikhlash/hr-service@sha256:' + '5'.repeat(64),
    },
  },
}
const found = applyPins({
  lock,
  tags: [
    'hr-web@0.1.0',
    'hr-web@0.2.0',
    'portal-web@0.1.0',
    'hr-service@0.1.0',
  ],
  digest: (name, version) => `sha256:${sha}${name}${version}`.slice(0, 71),
  manifest: (app, version) =>
    app === 'hr' && version === '0.2.0' ? '{"a":1}\n' : null,
})
assert.deepEqual(found.changes, ['hr-web 0.2.0'])
assert.equal(found.lock.apps.hr.webVersion, '0.2.0')
assert.equal(found.lock.apps.hr.routesVersion, '0.2.0')
assert.equal(found.lock.apps.hr.routesSha256, sha256Hex('{"a":1}\n'))
assert.equal(
  JSON.stringify(found.lock.apps.portal),
  JSON.stringify(lock.apps.portal),
  'an unchanged pin is kept byte for byte',
)
assert.equal(JSON.stringify(found.lock.services), JSON.stringify(lock.services))
assert.equal(lock.apps.hr.webVersion, '0.1.0', 'the input lock is not mutated')

const skipped = applyPins({
  lock,
  tags: ['hr-web@0.2.0'],
  digest: () => null,
  manifest: () => '{}',
})
assert.deepEqual(
  skipped.changes,
  [],
  'a version whose image is not built yet is not pinned',
)

const files = [
  { name: 'nginx.ssl.conf', content: 'b' },
  { name: 'nginx.conf', content: 'a' },
]
const tag = gatewayTag(files)
assert.match(tag, /^[a-f0-9]{12}$/)
assert.equal(
  gatewayTag([...files].reverse()),
  tag,
  'file order does not matter',
)
assert.notEqual(
  gatewayTag([files[0], { name: 'nginx.conf', content: 'changed' }]),
  tag,
)

console.log('update-lock test passed')
