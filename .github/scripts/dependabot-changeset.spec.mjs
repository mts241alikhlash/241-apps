import assert from 'node:assert/strict'
import test from 'node:test'
import { changesetText, packagesForFiles } from './dependabot-changeset.mjs'

const packages = [
  { name: 'hr-service', dir: 'services/hr-service' },
  { name: 'hr-web', dir: 'apps/hr-web' },
  { name: '@mts241alikhlash/ui', dir: 'packages/ui' },
  { name: 'infra', dir: 'infra' },
]

test('a package.json inside a package names that package', () => {
  assert.deepEqual(
    packagesForFiles(['services/hr-service/package.json'], packages),
    ['hr-service'],
  )
})

test('a Dockerfile inside a package names that package, infra/gateway belongs to infra', () => {
  assert.deepEqual(
    packagesForFiles(
      ['apps/hr-web/Dockerfile', 'infra/gateway/Dockerfile'],
      packages,
    ),
    ['hr-web', 'infra'],
  )
})

test('the root package.json, the lockfile and source files name nobody', () => {
  assert.deepEqual(
    packagesForFiles(
      [
        'package.json',
        'pnpm-lock.yaml',
        'pnpm-workspace.yaml',
        'apps/hr-web/src/a.ts',
      ],
      packages,
    ),
    [],
  )
})

test('names are unique and sorted', () => {
  assert.deepEqual(
    packagesForFiles(
      [
        'packages/ui/package.json',
        'apps/hr-web/package.json',
        'apps/hr-web/Dockerfile',
      ],
      packages,
    ),
    ['@mts241alikhlash/ui', 'hr-web'],
  )
})

test('the changeset lists every package as patch and says which PR', () => {
  const text = changesetText(['hr-web', '@mts241alikhlash/ui'], 12)
  assert.match(
    text,
    /^---\n'hr-web': patch\n'@mts241alikhlash\/ui': patch\n---\n/,
  )
  assert.match(text, /Dependabot update \(#12\)/)
})

test('no package means no changeset', () => {
  assert.equal(changesetText([], 12), '')
})
