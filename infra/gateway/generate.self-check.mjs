#!/usr/bin/env node

import assert from 'node:assert/strict'
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
import { addAppServices, promote } from '../scripts/update-lock.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.dirname(here)
const model = await loadInputs({ rootDir, environment: 'staging' })

assert.equal(model.manifests.length, 9)
const httpConfig = renderConfig(model, { ssl: false })
assert.equal(httpConfig, renderConfig(model, { ssl: false }))
assert.match(httpConfig, /default_type application\/json;/)
assert.match(httpConfig, /server_tokens off;/)
assert.match(httpConfig, /^client_max_body_size 6m;$/m)
for (const config of [httpConfig, renderConfig(model, { ssl: true })]) {
  for (const location of ['location \\/assets\\/', 'location = \\/index\\.html']) {
    assert.match(
      config,
      new RegExp(`${location} \\{[^}]*X-Content-Type-Options[^}]*Content-Security-Policy[^}]*\\}`),
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
for (const app of ['academic', 'admin', 'admission', 'assessment', 'exam', 'hr', 'inventory', 'portal']) {
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
assert.match(httpConfig, /server_name dev-portal\.mts241alikhlash\.sch\.id;/)
assert.match(httpConfig, /upstream academic_web \{[\s\S]*server academic-web:8080 resolve;/)
assert.match(httpConfig, /proxy_pass         http:\/\/academic_web;/)
assert.doesNotMatch(httpConfig, /root \/usr\/share\/nginx\/html\//)
assert.match(httpConfig, /server identity-service:3000 resolve;/)
assert.match(renderConfig(model, { ssl: true }), /listen 443 ssl;/)
assert.equal(validateModel({ manifests: model.manifests, upstreams: model.upstreams }), true)

const productionModel = await loadInputs({ rootDir, environment: 'production' })
const productionConfig = renderConfig(productionModel, { ssl: true })
assert.match(httpConfig, /upstream exam_web \{[\s\S]*server exam-web:8080 resolve;/)
assert.match(httpConfig, /server_name dev-exam\.mts241alikhlash\.sch\.id;/)
assert.match(productionConfig, /upstream exam_web \{[\s\S]*server exam-web:8080 resolve;/)
assert.match(productionConfig, /server_name exam\.mts241alikhlash\.sch\.id;/)

const placeholderProduction = structuredClone(productionModel.lock)
const unpublishedStaging = structuredClone(model.lock)
unpublishedStaging.apps.exam.webImage = `ghcr.io/mts241alikhlash/exam-web@sha256:${'0'.repeat(0)}REPLACE_BEFORE_DEPLOYMENT`
assert.deepEqual(requiredApps(placeholderProduction, model.lock), [
  'account',
  'academic',
  'admission',
  'admin',
  'assessment',
  'exam',
  'hr',
  'inventory',
  'portal',
])
assert.ok(requiredApps(model.lock, model.lock).includes('exam'))
const unpublishedProduction = structuredClone(placeholderProduction)
unpublishedProduction.apps.exam.webImage = `ghcr.io/mts241alikhlash/exam-web@sha256:${'0'.repeat(0)}REPLACE_BEFORE_DEPLOYMENT`
assert.throws(
  () =>
    validateDeploymentLock(unpublishedProduction, {
      expectedApps: EXPECTED_APPS,
      staging: unpublishedStaging,
      requirePinnedImages: true,
    }),
  /deployment apps\.exam\.webImage must be pinned by sha256 digest/,
)
const releasedStaging = structuredClone(model.lock)
releasedStaging.apps.exam.webImage = `ghcr.io/mts241alikhlash/exam-web@sha256:${'0'.repeat(64)}`
assert.ok(requiredApps(placeholderProduction, releasedStaging).includes('exam') === true)
assert.doesNotThrow(() =>
  validateDeploymentLock(placeholderProduction, {
    expectedApps: EXPECTED_APPS,
    staging: releasedStaging,
  }),
)
assert.doesNotThrow(() =>
  validateDeploymentLock(placeholderProduction, {
    expectedApps: EXPECTED_APPS,
    staging: releasedStaging,
    requirePinnedImages: true,
  }),
)

const promoted = structuredClone(placeholderProduction)
const promotedChanges = []
promote(promoted, releasedStaging, promotedChanges)
assert.deepEqual(promoted.apps.exam, {
  ...releasedStaging.apps.exam,
  sslHost: 'exam.mts241alikhlash.sch.id',
})
assert.ok(promotedChanges.includes(`exam-web ${releasedStaging.apps.exam.webVersion}`))
assert.deepEqual(requiredApps(promoted, releasedStaging), EXPECTED_APPS)
assert.doesNotThrow(() =>
  validateDeploymentLock(promoted, {
    expectedApps: EXPECTED_APPS,
    staging: releasedStaging,
    requirePinnedImages: true,
  }),
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
const withExam = addAppServices(composeStub, { exam: promoted.apps.exam })
assert.match(withExam, /\n {2}exam-web:\n {4}<<: \*web-defaults\n {4}image: ghcr\.io\/mts241alikhlash\/exam-web@sha256:0{64}\n/)
assert.match(withExam, / {6}exam-web:\n {8}condition: service_healthy\n/)
assert.equal(addAppServices(withExam, { exam: promoted.apps.exam }), withExam)

const academic = structuredClone(model.manifests.find(({ app }) => app === 'academic'))
academic.servicePrefixes.identity.push('/auth')
assert.throws(
  () => validateModel({ ...model, manifests: [academic] }),
  /duplicate/,
)

const overlapping = structuredClone(model.manifests.find(({ app }) => app === 'academic'))
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

const unknownService = structuredClone(model.manifests.find(({ app }) => app === 'academic'))
unknownService.servicePrefixes.unknown = ['/unknown']
assert.throws(
  () => validateModel({ ...model, manifests: [unknownService] }),
  /no upstream declared for "unknown"/,
)

const badUpstream = structuredClone(model)
badUpstream.upstreams.identity.port = 3999
assert.throws(
  () => validateDeploymentLock(badUpstream.lock, { upstreams: badUpstream.upstreams }),
  /deployment services\.identity\.upstream does not match upstream registry/,
)

const badChecksum = structuredClone(model)
badChecksum.artifacts[0].checksum = '0'.repeat(64)
assert.throws(() => validateModel(badChecksum), /manifest checksum mismatch/)

const unpinnedGateway = structuredClone(model.lock)
unpinnedGateway.gatewayImage =
  'ghcr.io/mts241alikhlash/platform-gateway@sha256:REPLACE_BEFORE_DEPLOYMENT'
assert.throws(
  () => validateDeploymentLock(unpinnedGateway, { requirePinnedImages: true }),
  /pinned by sha256 digest/,
)

const invalidManifest = structuredClone(model.manifests.find(({ app }) => app === 'academic'))
invalidManifest.schemaVersion = 2
assert.throws(() => validateManifest(invalidManifest, model.schema), /schemaVersion must be 1/)

const unsafePrefix = structuredClone(model.manifests.find(({ app }) => app === 'academic'))
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
