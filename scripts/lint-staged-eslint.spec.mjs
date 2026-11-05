import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { groupByPackage } from './lint-staged-eslint.mjs'

const root = path.resolve(import.meta.dirname, '..')

test('groups staged files under the package that owns them', () => {
  const groups = groupByPackage([
    path.join(root, 'apps/hr-web/src/a.ts'),
    path.join(root, 'apps/hr-web/src/b.vue'),
    path.join(root, 'services/hr-service/src/c.ts'),
  ])
  assert.deepEqual([...groups.keys()].sort(), [
    path.join(root, 'apps/hr-web'),
    path.join(root, 'services/hr-service'),
  ])
  assert.equal(groups.get(path.join(root, 'apps/hr-web')).length, 2)
})

test('skips files whose package has no ESLint config', () => {
  const groups = groupByPackage([path.join(root, 'scripts/x.mjs')])
  assert.equal(groups.size, 0)
})
