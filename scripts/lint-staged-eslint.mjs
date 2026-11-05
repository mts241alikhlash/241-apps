import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ESLINT_CONFIGS = ['eslint.config.mjs', 'eslint.config.js']

function owningPackage(file) {
  let dir = path.dirname(file)
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return ESLINT_CONFIGS.some((c) => fs.existsSync(path.join(dir, c)))
        ? dir
        : null
    }
    dir = path.dirname(dir)
  }
  return null
}

export function groupByPackage(files) {
  const groups = new Map()
  for (const file of files) {
    const dir = owningPackage(file)
    if (dir) groups.set(dir, [...(groups.get(dir) ?? []), file])
  }
  return groups
}

if (import.meta.main) {
  for (const [dir, files] of groupByPackage(process.argv.slice(2))) {
    execFileSync(
      'pnpm',
      [
        'exec',
        'eslint',
        '--fix',
        '--max-warnings=0',
        '--no-warn-ignored',
        ...files,
      ],
      { cwd: dir, stdio: 'inherit' },
    )
  }
}
