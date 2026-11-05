#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  EXPECTED_APPS,
  loadInputs,
  renderConfig,
  requiredApps,
  validateDeploymentLock,
  validateModel,
  validateManifest,
} from './generate.mjs'
import { addAppServices } from '../scripts/update-lock.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.dirname(here)
const model = await loadInputs({ rootDir })

assert.equal(model.manifests.length, 9)

function locationsOf(config, serverName) {
  const block = config
    .split(/^server \{$/m)
    .find(
      (part) =>
        part.includes(`server_name ${serverName};`) &&
        part.includes('location '),
    )
  assert.ok(block, `no server block for ${serverName}`)
  return [
    ...block.matchAll(
      /^    location (=|\^~|~\*|~)? ?(\S+) \{([\s\S]*?)^    \}/gm,
    ),
  ].map((m) => ({
    modifier: m[1] ?? '',
    pattern: m[2],
    body: m[3],
  }))
}

function resolveLocation(locations, uri) {
  const exact = locations.find((l) => l.modifier === '=' && l.pattern === uri)
  if (exact) return exact
  const prefixes = locations
    .filter(
      (l) =>
        (l.modifier === '' || l.modifier === '^~') && uri.startsWith(l.pattern),
    )
    .sort((a, b) => b.pattern.length - a.pattern.length)
  if (prefixes[0]?.modifier === '^~') return prefixes[0]
  return prefixes[0]
}

for (const ssl of [false, true]) {
  const config = renderConfig(model, { ssl })
  for (const manifest of model.manifests) {
    const host = model.lock.apps[manifest.app].sslHost
    const locations = locationsOf(config, host)
    assert.ok(
      !locations.some((l) => l.pattern === '/assets/'),
      `${manifest.app} still has location /assets/`,
    )
    const statics = locations.find(
      (l) => l.modifier === '^~' && l.pattern === '/_app/',
    )
    assert.ok(statics, `${manifest.app} has no ^~ /_app/ location`)
    assert.match(
      statics.body,
      /add_header Cache-Control "public, max-age=31536000, immutable" always;/,
    )
    const index = locations.find(
      (l) => l.modifier === '=' && l.pattern === '/index.html',
    )
    assert.match(index.body, /add_header Cache-Control "no-cache" always;/)
  }
  const inventory = locationsOf(config, model.lock.apps.inventory.sslHost)
  for (const uri of ['/assets', '/assets/create', '/assets/123/edit']) {
    assert.equal(
      resolveLocation(inventory, uri).pattern,
      '/',
      `${uri} must reach the SPA fallback`,
    )
  }
  assert.equal(
    resolveLocation(inventory, '/_app/index-abc.js').pattern,
    '/_app/',
  )
}

for (const app of EXPECTED_APPS) {
  const nginx = readFileSync(
    path.join(rootDir, '..', 'apps', `${app}-web`, 'nginx.conf'),
    'utf8',
  )
  assert.match(
    nginx,
    /location \^~ \/_app\/ \{ try_files \$uri =404; add_header Cache-Control "public, max-age=31536000, immutable" always; \}/,
    `${app} image serves /_app with immutable caching`,
  )
  assert.match(
    nginx,
    /location = \/index\.html \{ add_header Cache-Control "no-cache" always; \}/,
    `${app} image serves index.html no-cache`,
  )
  assert.match(
    nginx,
    /location \/ \{ try_files \$uri \/index\.html; \}/,
    `${app} image falls back to index.html without a directory redirect`,
  )
  assert.ok(!nginx.includes('/assets/'), `${app} image still has /assets/`)
}
const httpConfig = renderConfig(model, { ssl: false })
assert.equal(httpConfig, renderConfig(model, { ssl: false }))
assert.match(httpConfig, /default_type application\/json;/)
assert.match(httpConfig, /server_tokens off;/)
assert.match(httpConfig, /^client_max_body_size 6m;$/m)
for (const config of [httpConfig, renderConfig(model, { ssl: true })]) {
  for (const location of [
    'location \\^~ \\/_app\\/',
    'location = \\/index\\.html',
  ]) {
    assert.match(
      config,
      new RegExp(
        `${location} \\{[^}]*X-Content-Type-Options[^}]*Content-Security-Policy[^}]*\\}`,
      ),
      `${location} keeps the security headers its own add_header would drop`,
    )
  }
}
assert.match(
  httpConfig,
  /add_header Content-Security-Policy "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" always;/,
)
assert.match(
  renderConfig(model, { ssl: true }),
  /add_header Content-Security-Policy "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" always;/,
)
assert.match(renderConfig(model, { ssl: true }), /^client_max_body_size 6m;$/m)
assert.match(
  httpConfig,
  /server_name [^;]*accounts[^;]*;[\s\S]*?location ~ \^\/\([^)]*\bsso\b[^)]*\)/,
  'the accounts host routes /sso to identity',
)
for (const app of [
  'academic',
  'admin',
  'admission',
  'assessment',
  'exam',
  'hr',
  'inventory',
  'portal',
]) {
  const manifest = model.manifests.find((entry) => entry.app === app)
  assert.ok(
    manifest.servicePrefixes.identity.includes('/sso'),
    `${app} routes /sso to identity`,
  )
}
assert.match(httpConfig, /Route not handled by gateway/)
assert.doesNotMatch(
  httpConfig.match(/map \$http_sec_fetch_mode \$serve_spa_shell \{[^}]*\}/)[0],
  /"no-cors"/,
  'no-cors loads such as <img src="/logo.webp"> reach the web image',
)
assert.match(httpConfig, /location ~ \^\/\(settings\)\(\/\|\$\)/)
assert.match(httpConfig, /server_name portal\.mts241alikhlash\.sch\.id;/)
assert.match(
  httpConfig,
  /upstream academic_web \{[\s\S]*server academic-web:8080 resolve;/,
)
assert.match(httpConfig, /proxy_pass         http:\/\/academic_web;/)
assert.doesNotMatch(httpConfig, /root \/usr\/share\/nginx\/html\//)
assert.match(httpConfig, /server identity-service:3000 resolve;/)
assert.match(renderConfig(model, { ssl: true }), /listen 443 ssl;/)
assert.equal(
  validateModel({ manifests: model.manifests, upstreams: model.upstreams }),
  true,
)

assert.match(
  httpConfig,
  /upstream exam_web \{[\s\S]*server exam-web:8080 resolve;/,
)
assert.match(httpConfig, /server_name exam\.mts241alikhlash\.sch\.id;/)
assert.deepEqual(requiredApps(), EXPECTED_APPS)

const unpublished = structuredClone(model.lock)
unpublished.apps.exam.webImage = `ghcr.io/mts241alikhlash/exam-web@sha256:REPLACE_BEFORE_DEPLOYMENT`
assert.throws(
  () =>
    validateDeploymentLock(unpublished, {
      expectedApps: EXPECTED_APPS,
      requirePinnedImages: true,
    }),
  /deployment apps\.exam\.webImage must be pinned by sha256 digest/,
)

const composeStub = [
  'services:',
  '  gateway:',
  '    depends_on:',
  '      portal-web:',
  '        condition: service_healthy',
  '      identity-service:',
  '        condition: service_healthy',
  '',
  '  portal-web:',
  '    <<: *web-defaults',
  '    image: ghcr.io/mts241alikhlash/portal-web@sha256:' + '1'.repeat(64),
  '',
  '  identity-service:',
  '    <<: *service-defaults',
  '',
].join('\n')
const exam = model.lock.apps.exam
const withExam = addAppServices(composeStub, { exam })
assert.ok(
  withExam.includes(
    `\n  exam-web:\n    <<: *web-defaults\n    image: ${exam.webImage}\n`,
  ),
)
assert.match(withExam, / {6}exam-web:\n {8}condition: service_healthy\n/)
assert.equal(addAppServices(withExam, { exam }), withExam)

const academic = structuredClone(
  model.manifests.find(({ app }) => app === 'academic'),
)
academic.servicePrefixes.identity.push('/auth')
assert.throws(
  () => validateModel({ ...model, manifests: [academic] }),
  /duplicate/,
)

const overlapping = structuredClone(
  model.manifests.find(({ app }) => app === 'academic'),
)
overlapping.servicePrefixes.identity.push('/auth/login')
assert.throws(
  () => validateModel({ ...model, manifests: [overlapping] }),
  /overlapping prefix/,
)

const routedAndUnroutedOverlap = structuredClone(
  model.manifests.find(({ app }) => app === 'academic'),
)
routedAndUnroutedOverlap.unroutedPrefixes = ['/auth']
assert.throws(
  () => validateModel({ ...model, manifests: [routedAndUnroutedOverlap] }),
  /duplicate prefix/,
)

const duplicateHost = structuredClone(model)
duplicateHost.deployments.admin.serverName = '_'
assert.throws(
  () => validateModel(duplicateHost),
  /duplicate gateway server name/,
)

const unknownService = structuredClone(
  model.manifests.find(({ app }) => app === 'academic'),
)
unknownService.servicePrefixes.unknown = ['/unknown']
assert.throws(
  () => validateModel({ ...model, manifests: [unknownService] }),
  /no upstream declared for "unknown"/,
)

const badUpstream = structuredClone(model)
badUpstream.upstreams.identity.port = 3999
assert.throws(
  () =>
    validateDeploymentLock(badUpstream.lock, {
      upstreams: badUpstream.upstreams,
    }),
  /deployment services\.identity\.upstream does not match upstream registry/,
)

const badChecksum = structuredClone(model)
badChecksum.artifacts[0].checksum = '0'.repeat(64)
assert.throws(() => validateModel(badChecksum), /manifest checksum mismatch/)

const unpinnedGateway = structuredClone(model.lock)
unpinnedGateway.gatewayImage =
  'ghcr.io/mts241alikhlash/gateway@sha256:REPLACE_BEFORE_DEPLOYMENT'
assert.throws(
  () => validateDeploymentLock(unpinnedGateway, { requirePinnedImages: true }),
  /pinned by sha256 digest/,
)

const invalidManifest = structuredClone(
  model.manifests.find(({ app }) => app === 'academic'),
)
invalidManifest.schemaVersion = 2
assert.throws(
  () => validateManifest(invalidManifest, model.schema),
  /schemaVersion must be 1/,
)

const unsafePrefix = structuredClone(
  model.manifests.find(({ app }) => app === 'academic'),
)
unsafePrefix.servicePrefixes.identity.push('/auth$')
assert.throws(
  () => validateManifest(unsafePrefix, model.schema),
  /must be a lowercase URL prefix/,
)

const unsafeRoot = structuredClone(model.lock)
unsafeRoot.apps.academic.root = '/usr/share/../html/academic'
assert.throws(
  () => validateDeploymentLock(unsafeRoot),
  /must be an absolute path/,
)

console.log('gateway self-check passed')
