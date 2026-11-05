import { execFileSync } from 'node:child_process'
import path from 'node:path'

export function kindOf(dir) {
  if (dir.startsWith('apps/')) return 'app'
  if (dir.startsWith('services/')) return 'service'
  return 'library'
}

export function selectTargets(packages, tags) {
  const existing = new Set(tags)
  return packages
    .filter((pkg) => !existing.has(`${pkg.name}@${pkg.version}`))
    .map((pkg) => ({
      name: pkg.name,
      version: pkg.version,
      dir: pkg.dir,
      kind: kindOf(pkg.dir),
    }))
}

export function workspacePackages(root) {
  const out = execFileSync('pnpm', ['ls', '-r', '--json', '--depth', '-1'], {
    encoding: 'utf8',
    cwd: root,
  })
  return JSON.parse(out)
    .filter((pkg) => pkg.path !== root)
    .map((pkg) => ({
      name: pkg.name,
      version: pkg.version,
      dir: path.relative(root, pkg.path).replaceAll('\\', '/'),
    }))
}

if (import.meta.main) {
  const root = process.cwd()
  const tags = execFileSync('git', ['tag', '--list'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
  console.log(JSON.stringify(selectTargets(workspacePackages(root), tags)))
}
