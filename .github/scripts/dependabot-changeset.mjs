import { readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

export function packagesForFiles(files, packages) {
  const names = new Set()
  for (const file of files) {
    if (!/(^|\/)(package\.json|Dockerfile)$/.test(file)) continue
    const owner = packages
      .filter((pkg) => file.startsWith(`${pkg.dir}/`))
      .sort((a, b) => b.dir.length - a.dir.length)[0]
    if (owner) names.add(owner.name)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

export function changesetText(names, pr) {
  if (names.length === 0) return ''
  const front = names.map((name) => `'${name}': patch`).join('\n')
  return `---\n${front}\n---\n\nDependabot update (#${pr}).\n`
}

export function readPackages(root) {
  const dirs = ['infra']
  for (const parent of ['apps', 'services', 'packages']) {
    for (const entry of readdirSync(path.join(root, parent))) {
      dirs.push(`${parent}/${entry}`)
    }
  }
  return dirs
    .filter((dir) => existsSync(path.join(root, dir, 'package.json')))
    .map((dir) => ({
      dir,
      name: JSON.parse(
        readFileSync(path.join(root, dir, 'package.json'), 'utf8'),
      ).name,
    }))
}

if (import.meta.main) {
  const pr = process.argv[2]
  const files = readFileSync(0, 'utf8').split('\n').filter(Boolean)
  const text = changesetText(
    packagesForFiles(files, readPackages(process.cwd())),
    pr,
  )
  process.stdout.write(text)
}
