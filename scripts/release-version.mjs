import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { workspacePackages } from './release-targets.mjs'

export function appsNeedingManifest(before, after) {
  return [...after]
    .filter(
      ([name, version]) =>
        name.endsWith('-web') && before.get(name) !== version,
    )
    .map(([name, version]) => ({ name, version }))
}

export function manifestFile(name, version) {
  return `infra/gateway/manifests/${name.replace(/-web$/, '')}-${version}.json`
}

const versions = (root) =>
  new Map(workspacePackages(root).map((pkg) => [pkg.name, pkg.version]))

if (import.meta.main) {
  const root = process.cwd()
  const run = (args) =>
    execFileSync('pnpm', args, { cwd: root, stdio: 'inherit' })
  const before = versions(root)
  run(['exec', 'changeset', 'version'])
  const after = versions(root)
  for (const { name, version } of appsNeedingManifest(before, after)) {
    run(['--filter', name, 'run', 'routes:emit'])
    const source = path.join(
      root,
      'apps',
      name,
      'dist',
      'routing-manifest',
      `${name}-routes-${version}.json`,
    )
    const target = path.join(root, manifestFile(name, version))
    mkdirSync(path.dirname(target), { recursive: true })
    copyFileSync(source, target)
  }
  run(['run', 'openapi:emit'])
  run(['run', 'api:generate'])
  run(['install', '--lockfile-only'])
}
