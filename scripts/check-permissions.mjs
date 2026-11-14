import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const CATALOG =
  'services/identity-service/src/access-control/permission/constants/permission-codes.constants.ts'
const ROOTS = ['services', 'apps', 'packages/platform']
const USE =
  /(?:RequirePermissions|RequireAnyPermissions?|requiredPermission|requiredAnyPermission|hasPermission|hasAnyPermission)\s*[:(]\s*\[?\s*((?:'[a-z0-9-]+\.[a-z0-9.-]+'\s*,?\s*)+)/g
const CODE = /'([a-z0-9-]+\.[a-z0-9.-]+)'/g

export function catalogCodes(source) {
  return new Set(
    [...source.matchAll(/code:\s*'([a-z0-9.-]+)'/g)].map((m) => m[1]),
  )
}

export function usedCodes(source) {
  const codes = []
  for (const use of source.matchAll(USE)) {
    for (const code of use[1].matchAll(CODE)) codes.push(code[1])
  }
  return codes
}

function* sourceFiles(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'generated' || name === 'dist')
      continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* sourceFiles(path)
    else if (/\.(ts|vue)$/.test(name) && !/\.spec\.ts$/.test(name)) yield path
  }
}

export function missingCodes(root = '.') {
  const catalog = catalogCodes(readFileSync(join(root, CATALOG), 'utf8'))
  const missing = new Map()
  for (const base of ROOTS) {
    for (const file of sourceFiles(join(root, base))) {
      for (const code of usedCodes(readFileSync(file, 'utf8'))) {
        if (!catalog.has(code)) missing.set(code, file)
      }
    }
  }
  return missing
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const missing = missingCodes()
  for (const [code, file] of missing)
    console.error(`${code} (${file}) is not in ${CATALOG}`)
  if (missing.size > 0) process.exit(1)
  console.log('permissions ok')
}
