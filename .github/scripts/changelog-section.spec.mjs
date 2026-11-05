import assert from 'node:assert/strict'
import test from 'node:test'
import { changelogSection } from './changelog-section.mjs'

const text = `# hr-service

## 0.3.0

### Minor Changes

- add leave

## 0.2.0

- first
`

test('returns the section of the asked version', () => {
  assert.match(changelogSection(text, '0.3.0'), /add leave/)
  assert.doesNotMatch(changelogSection(text, '0.3.0'), /first/)
})

test('falls back to a plain line when the version has no section', () => {
  assert.equal(changelogSection(text, '9.9.9'), 'Release 9.9.9')
})
