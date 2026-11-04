#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const prefixRe = /^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/
const versionRe = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const routes = await import(pathToFileURL(path.join(root, 'api-routes.config.ts')).href)
const manifest = {
  schemaVersion: 1,
  app: packageJson.name.replace(/-web$/, ''),
  webVersion: packageJson.version,
  servicePrefixes: routes.SERVICE_PREFIXES,
  unroutedPrefixes: routes.UNROUTED_PREFIXES,
  healthRoutes: routes.HEALTH_ROUTES,
}

function fail(message) {
  throw new Error(message)
}

function checkPrefix(value, label) {
  if (typeof value !== 'string' || !prefixRe.test(value)) fail(`${label} must be a lowercase URL prefix`)
}

function checkUnique(values, label) {
  if (new Set(values).size !== values.length) fail(`${label} contains duplicate items`)
}

if (manifest.schemaVersion !== 1) fail('schemaVersion must be 1')
if (!versionRe.test(manifest.webVersion)) fail('webVersion must be semantic version')
const paths = []
for (const [service, prefixes] of Object.entries(manifest.servicePrefixes)) {
  if (!/^[a-z][a-z0-9-]*$/.test(service)) fail(`invalid service ${service}`)
  checkUnique(prefixes, `${service} prefixes`)
  prefixes.forEach((prefix, index) => {
    checkPrefix(prefix, `servicePrefixes.${service}[${index}]`)
    paths.push(prefix)
  })
}
checkUnique(manifest.unroutedPrefixes, 'unrouted prefixes')
manifest.unroutedPrefixes.forEach((prefix, index) => {
  checkPrefix(prefix, `unroutedPrefixes[${index}]`)
  paths.push(prefix)
})
checkUnique(manifest.healthRoutes.map(({ path: routePath }) => routePath), 'health route paths')
manifest.healthRoutes.forEach(({ path: routePath, service }, index) => {
  checkPrefix(routePath, `healthRoutes[${index}].path`)
  if (!/^[a-z][a-z0-9-]*$/.test(service)) fail(`invalid health service ${service}`)
  paths.push(routePath)
})
checkUnique(paths, 'manifest routes')
for (let index = 0; index < paths.length; index += 1) {
  for (let next = index + 1; next < paths.length; next += 1) {
    if (paths[index].startsWith(`${paths[next]}/`) || paths[next].startsWith(`${paths[index]}/`)) {
      fail(`manifest routes overlap: ${paths[index]} and ${paths[next]}`)
    }
  }
}

if (process.argv.includes('--check')) {
  console.log(`${manifest.app} routing manifest valid for ${manifest.webVersion}`)
  process.exit(0)
}

const raw = `${JSON.stringify(manifest, null, 2)}\n`
const outputDir = path.join(root, 'dist', 'routing-manifest')
const outputFile = path.join(outputDir, `${packageJson.name}-routes-${packageJson.version}.json`)
const checksum = createHash('sha256').update(raw).digest('hex')
await mkdir(outputDir, { recursive: true })
await writeFile(outputFile, raw)
await writeFile(`${outputFile}.sha256`, `sha256:${checksum}\n`)
console.log(`wrote ${path.relative(root, outputFile)} sha256:${checksum}`)
