import assert from 'node:assert/strict'
import test from 'node:test'
import { affectedFilter } from './affected.mjs'

for (const file of [
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'package.json',
  '.npmrc',
  '.node-version',
  '.github/workflows/validate.yml',
  'scripts/affected.mjs',
]) {
  test(`${file} makes everything affected`, () => {
    assert.equal(
      affectedFilter([file, 'apps/hr-web/src/a.ts'], 'origin/main'),
      'all',
    )
  })
}

test('a package change prints the pnpm filter', () => {
  assert.equal(
    affectedFilter(['apps/hr-web/src/a.ts', 'docs/x.md'], 'abc123'),
    '...[abc123]',
  )
})

test('a nested package.json is not a root change', () => {
  assert.equal(
    affectedFilter(['services/hr-service/package.json'], 'abc'),
    '...[abc]',
  )
})

test('a contract change only affects the packages that changed with it', () => {
  assert.equal(
    affectedFilter(
      [
        'contracts/exam.openapi.json',
        'services/exam-service/src/a.ts',
        'packages/exam-api/src/generated.ts',
      ],
      'abc',
    ),
    '...[abc]',
  )
})
