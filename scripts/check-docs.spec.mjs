import assert from 'node:assert/strict'
import test from 'node:test'
import { brokenLinks, packageShape, serverFacts } from './check-docs.mjs'

const HEADINGS = [
  'Purpose',
  'Depends on',
  'Rules specific to this package',
  'Gotchas',
  'Open work',
]
const readme = (hs) => hs.map((h) => `## ${h}\n\ntext\n`).join('\n')

test('brokenLinks reports a missing relative target', () => {
  const out = brokenLinks(
    [{ path: 'a.md', text: '[x](./missing.md)' }],
    () => false,
  )
  assert.deepEqual(out, ['a.md: ./missing.md'])
})

test('brokenLinks ignores urls, anchors and fenced code', () => {
  const text = [
    '[a](https://x.dev)',
    '[b](mailto:a@b.c)',
    '[c](#top)',
    '```',
    '[d](./gone.md)',
    '```',
  ].join('\n')
  assert.deepEqual(
    brokenLinks([{ path: 'a.md', text }], () => false),
    [],
  )
})

test('brokenLinks resolves relative to the file and strips anchors', () => {
  const seen = []
  brokenLinks([{ path: 'docs/a.md', text: '[x](../b.md#h)' }], (p) => {
    seen.push(p)
    return true
  })
  assert.deepEqual(seen, ['b.md'])
})

test('serverFacts rejects an IPv4 literal and accepts local ones', () => {
  assert.equal(serverFacts('a.md', 'host 203.0.113.7').length, 1)
  assert.deepEqual(serverFacts('a.md', '127.0.0.1 and 0.0.0.0'), [])
})

test('packageShape accepts a complete package', () => {
  const files = {
    'README.md': readme(HEADINGS),
    'AGENTS.md': 'one\ntwo\n',
    'CLAUDE.md': { symlink: 'AGENTS.md' },
  }
  assert.deepEqual(packageShape('services/x', files), [])
})

test('packageShape reports missing and misordered headings', () => {
  const files = {
    'README.md': readme([...HEADINGS].reverse()),
    'AGENTS.md': 'a\n',
    'CLAUDE.md': { symlink: 'AGENTS.md' },
  }
  assert.equal(packageShape('services/x', files).length, 1)
})

test('packageShape reports a missing AGENTS.md, a plain CLAUDE.md and a long AGENTS.md', () => {
  assert.ok(
    packageShape('p', { 'README.md': readme(HEADINGS) }).some((m) =>
      m.includes('AGENTS.md'),
    ),
  )
  assert.ok(
    packageShape('p', {
      'README.md': readme(HEADINGS),
      'AGENTS.md': 'a\n',
      'CLAUDE.md': 'plain',
    }).some((m) => m.includes('symlink')),
  )
  assert.ok(
    packageShape('p', {
      'README.md': readme(HEADINGS),
      'AGENTS.md': 'a\n'.repeat(41),
      'CLAUDE.md': { symlink: 'AGENTS.md' },
    }).some((m) => m.includes('40')),
  )
})
