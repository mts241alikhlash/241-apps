import assert from 'node:assert/strict'
import test from 'node:test'
import { catalogCodes, missingCodes, usedCodes } from './check-permissions.mjs'

test('usedCodes reads guard decorators and route meta', () => {
  const source = `
    @RequirePermissions('exam-schedules.manage')
    meta: { requiredPermission: 'school-units.read' }
    hasAnyPermission(['a.read', 'b.write'])
  `
  assert.deepEqual(usedCodes(source), [
    'exam-schedules.manage',
    'school-units.read',
    'a.read',
    'b.write',
  ])
})

test('catalogCodes reads every code of the identity catalog', () => {
  assert.deepEqual(
    [...catalogCodes(`{ code: 'x.read' }, { code: 'y.manage-all' }`)],
    ['x.read', 'y.manage-all'],
  )
})

test('every permission a service or app checks exists in the identity catalog', () => {
  assert.deepEqual([...missingCodes().keys()], [])
})
