import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ownedByWorkspace,
  referencedServices,
  withDependencies,
  withEnvOverrides,
} from './dev-helpers.mjs'

test('referencedServices keeps only known service names', () => {
  const source = 'a.HR_SERVICE_URL b.STUDENT_SERVICE_URL c.OTHER_SERVICE_URL'
  assert.deepEqual(referencedServices(source, ['hr', 'student']).sort(), [
    'hr',
    'student',
  ])
})

test('withDependencies follows references transitively and ends on cycles', () => {
  const graph = { exam: ['hr'], hr: ['presence', 'exam'], presence: [] }
  assert.deepEqual(
    [...withDependencies(['exam'], (name) => graph[name] ?? [])].sort(),
    ['exam', 'hr', 'presence'],
  )
})

test('ownedByWorkspace tells a checkout from its nested worktree', () => {
  const main = '/repo'
  assert.equal(ownedByWorkspace('/repo/services/a', main), true)
  assert.equal(ownedByWorkspace('/repo/.worktrees/x/services/a', main), false)
  assert.equal(ownedByWorkspace('/other/services/a', main), false)
  const worktree = '/repo/.worktrees/x'
  assert.equal(ownedByWorkspace('/repo/.worktrees/x/apps/a', worktree), true)
  assert.equal(ownedByWorkspace('/repo/apps/a', worktree), false)
})

test('withEnvOverrides replaces only the keys it is given and keeps the rest', () => {
  const lines = ['# note', 'PORT=1', 'S3_ACCESS_KEY_ID=', 'KEEP=x', '']
  assert.deepEqual(
    withEnvOverrides(lines, { PORT: '2', S3_ACCESS_KEY_ID: 'local', NEW: 'n' }),
    ['# note', 'PORT=2', 'S3_ACCESS_KEY_ID=local', 'KEEP=x', ''],
  )
})
