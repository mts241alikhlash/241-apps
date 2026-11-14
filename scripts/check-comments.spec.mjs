import assert from 'node:assert/strict'
import test from 'node:test'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { commentLines, commentedFiles } from './check-comments.mjs'

test('commentLines finds line, block and template comments', () => {
  const source = 'const a = 1\n// why\n/* block */\n<!-- section -->\n'
  assert.deepEqual(
    commentLines(source, 'x.vue').map((hit) => hit.line),
    [2, 3, 4],
  )
})

test('commentLines keeps tool directives', () => {
  const source = [
    '// @vitest-environment happy-dom',
    '// @ts-expect-error deletedAt is not in the contract',
    '/* @vite-ignore */ href',
    '<!-- eslint-disable vue/no-v-html -- sanitized -->',
    '<!-- @strictTemplates true -->',
  ].join('\n')
  assert.deepEqual(commentLines(source, 'x.vue'), [])
})

test('commentLines leaves URLs inside strings alone', () => {
  assert.deepEqual(commentLines("const u = 'https://exam.example'", 'x.ts'), [])
})

test('the repository carries no code comments', () => {
  const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
  assert.deepEqual(
    commentedFiles(files, (path) => readFileSync(path, 'utf8')),
    [],
  )
})
