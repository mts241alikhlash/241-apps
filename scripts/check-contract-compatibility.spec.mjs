import assert from 'node:assert/strict'
import test from 'node:test'
import { bumpSatisfies, requiredBump } from './check-contract-compatibility.mjs'

test('a breaking change below 1.0.0 demands minor', () => {
  assert.equal(requiredBump('0.4.2'), 'minor')
  assert.equal(bumpSatisfies('minor', '0.4.2'), true)
  assert.equal(bumpSatisfies('patch', '0.4.2'), false)
  assert.equal(bumpSatisfies('major', '0.4.2'), true)
})

test('a breaking change from 1.0.0 demands major', () => {
  assert.equal(requiredBump('1.0.0'), 'major')
  assert.equal(bumpSatisfies('minor', '1.2.3'), false)
  assert.equal(bumpSatisfies('major', '1.2.3'), true)
  assert.equal(bumpSatisfies(undefined, '1.2.3'), false)
})
