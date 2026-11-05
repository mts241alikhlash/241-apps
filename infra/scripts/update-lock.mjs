#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const org = 'mts241alikhlash'
const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.dirname(here)
const manifestDir = path.join(root, 'gateway', 'manifests')
const MANIFEST_ACCEPT = [
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.v2+json',
].join(', ')

function compareVersions(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return 0
}

export function latestVersion(tags, prefix) {
  let best = null
  for (const tag of tags) {
    if (!tag.startsWith(`${prefix}@`)) continue
    const version = tag.slice(prefix.length + 1)
    if (!/^\d+\.\d+\.\d+$/.test(version)) continue
    if (!best || compareVersions(version, best) > 0) best = version
  }
  return best
}

export function manifestFileName(app, version) {
  return `${app}-${version}.json`
}

export function needsPin(pin, version) {
  if (!version) return false
  return (
    version !== pin.webVersion ||
    pin.webImage.endsWith('@sha256:REPLACE_BEFORE_DEPLOYMENT')
  )
}

export function referencedManifests(locks) {
  const names = new Set()
  for (const lock of locks) {
    for (const [app, pin] of Object.entries(lock.apps)) {
      names.add(manifestFileName(app, pin.routesVersion))
    }
  }
  return names
}

export function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function gatewayTag(files) {
  const hash = createHash('sha256')
  for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    hash.update(`${file.name}\0${file.content}\0`)
  }
  return hash.digest('hex').slice(0, 12)
}

export function pinCandidates(lock, tags) {
  const out = []
  for (const [app, pin] of Object.entries(lock.apps)) {
    const version = latestVersion(tags, `${app}-web`)
    if (needsPin(pin, version)) out.push({ name: `${app}-web`, version })
  }
  for (const [service, pin] of Object.entries(lock.services)) {
    const version = latestVersion(tags, `${service}-service`)
    if (version && version !== pin.version)
      out.push({ name: `${service}-service`, version })
  }
  return out
}

export function applyPins({ lock, tags, digest, manifest }) {
  const next = structuredClone(lock)
  const changes = []
  for (const [app, pin] of Object.entries(next.apps)) {
    const version = latestVersion(tags, `${app}-web`)
    if (!needsPin(pin, version)) continue
    const resolved = digest(`${app}-web`, version)
    const raw = manifest(app, version)
    if (!resolved || raw === null) continue
    Object.assign(pin, {
      webVersion: version,
      webImage: image(`${app}-web`, resolved),
      routesVersion: version,
      routesSha256: sha256Hex(raw),
    })
    changes.push(`${app}-web ${version}`)
  }
  for (const [service, pin] of Object.entries(next.services)) {
    const version = latestVersion(tags, `${service}-service`)
    if (!version || version === pin.version) continue
    const resolved = digest(`${service}-service`, version)
    if (!resolved) continue
    Object.assign(pin, {
      version,
      image: image(`${service}-service`, resolved),
    })
    changes.push(`${service}-service ${version}`)
  }
  return { lock: next, changes }
}

export function localTags(exec = execFileSync) {
  return exec('git', ['tag', '--list'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
}

async function imageDigest(name, tag) {
  const auth = await fetch(
    `https://ghcr.io/token?scope=repository:${org}/${name}:pull`,
  )
  if (!auth.ok) throw new Error(`ghcr token for ${name}: ${auth.status}`)
  const { token } = await auth.json()
  const res = await fetch(
    `https://ghcr.io/v2/${org}/${name}/manifests/${tag}`,
    {
      method: 'HEAD',
      headers: { Authorization: `Bearer ${token}`, Accept: MANIFEST_ACCEPT },
    },
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`${name}:${tag} -> ${res.status}`)
  return res.headers.get('docker-content-digest')
}

function readLock() {
  return JSON.parse(
    readFileSync(path.join(root, 'deployment', 'lock.json'), 'utf8'),
  )
}

function image(name, digest) {
  return `ghcr.io/${org}/${name}@${digest}`
}

export function pinImages(compose, images) {
  let pinned = compose
  for (const reference of images) {
    const name = reference.slice(0, reference.indexOf('@'))
    pinned = pinned.replace(
      new RegExp(
        `${name.replaceAll('.', '\\.')}@sha256:(?:[a-f0-9]{64}|REPLACE_BEFORE_DEPLOYMENT)`,
        'g',
      ),
      reference,
    )
  }
  return pinned
}

export function addAppServices(compose, apps) {
  const missing = Object.entries(apps).filter(
    ([app]) => !compose.includes(`\n  ${app}-web:\n`),
  )
  if (missing.length === 0) return compose

  const services = missing
    .map(
      ([app, pin]) =>
        `  ${app}-web:\n    <<: *web-defaults\n    image: ${pin.webImage}\n`,
    )
    .join('\n')
  const depends = missing
    .map(([app]) => `      ${app}-web:\n        condition: service_healthy\n`)
    .join('')

  const serviceAnchor = '\n  identity-service:\n'
  const dependsAnchor =
    '      identity-service:\n        condition: service_healthy\n'
  const serviceAt = compose.indexOf(serviceAnchor)
  const dependsAt = compose.indexOf(dependsAnchor)
  if (serviceAt < 0 || dependsAt < 0) {
    throw new Error(
      'compose file has no identity-service block to anchor app services',
    )
  }

  const withServices = `${compose.slice(0, serviceAt + 1)}\n${services}${compose.slice(serviceAt + 1)}`
  const at = withServices.indexOf(dependsAnchor)
  const end = at + dependsAnchor.length
  return `${withServices.slice(0, end)}${depends}${withServices.slice(end)}`
}

function writeCompose(lock) {
  const file = path.join(root, 'compose', 'compose.yaml')
  const images = [
    lock.gatewayImage,
    ...Object.values(lock.apps).map((pin) => pin.webImage),
    ...Object.values(lock.services).map((pin) => pin.image),
  ]
  const pinned = pinImages(readFileSync(file, 'utf8'), images)
  writeFileSync(file, addAppServices(pinned, lock.apps))
}

function writeLock(lock) {
  writeFileSync(
    path.join(root, 'deployment', 'lock.json'),
    `${JSON.stringify(lock, null, 2)}\n`,
  )
  writeCompose(lock)
}

function pruneManifests() {
  const keep = referencedManifests([readLock()])
  for (const name of readdirSync(manifestDir)) {
    if (name.endsWith('.json') && !keep.has(name))
      unlinkSync(path.join(manifestDir, name))
  }
}

function gatewayFiles() {
  return ['nginx.conf', 'nginx.ssl.conf'].map((name) => ({
    name,
    content: readFileSync(path.join(root, 'gateway', name), 'utf8'),
  }))
}

async function main(args) {
  if (args[0] === '--gateway-tag') {
    console.log(gatewayTag(gatewayFiles()))
    return
  }
  const lock = readLock()
  if (args[0] === '--pin-gateway') {
    const digest = await imageDigest('gateway', args[1])
    if (!digest) throw new Error(`gateway:${args[1]} is not in the registry`)
    const pinned = image('gateway', digest)
    if (lock.gatewayImage === pinned) {
      console.log('no changes')
      return
    }
    writeLock({ ...lock, gatewayImage: pinned })
    console.log(`gateway ${args[1]}`)
    return
  }
  const tags = localTags()
  const digests = new Map()
  for (const { name, version } of pinCandidates(lock, tags)) {
    digests.set(`${name}@${version}`, await imageDigest(name, version))
  }
  const { lock: next, changes } = applyPins({
    lock,
    tags,
    digest: (name, version) => digests.get(`${name}@${version}`) ?? null,
    manifest: (app, version) => {
      const file = path.join(manifestDir, manifestFileName(app, version))
      return existsSync(file) ? readFileSync(file, 'utf8') : null
    },
  })
  if (changes.length === 0) {
    console.log('no changes')
    return
  }
  writeLock(next)
  pruneManifests()
  for (const change of changes) console.log(change)
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  await main(process.argv.slice(2))
