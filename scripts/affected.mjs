import { execFileSync } from 'node:child_process'

const EVERYTHING = [
  /^pnpm-lock\.yaml$/,
  /^pnpm-workspace\.yaml$/,
  /^package\.json$/,
  /^\.npmrc$/,
  /^\.node-version$/,
  /^\.github\//,
  /^scripts\//,
  /^contracts\//,
]

export function affectedFilter(files, base) {
  return files.some((file) => EVERYTHING.some((re) => re.test(file)))
    ? 'all'
    : `...[${base}]`
}

if (import.meta.main) {
  const base = process.argv[2]
  if (!base) {
    console.error('usage: affected.mjs <base>')
    process.exit(2)
  }
  const files = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
  console.log(affectedFilter(files, base))
}
