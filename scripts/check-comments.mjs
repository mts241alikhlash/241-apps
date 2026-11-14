import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const SOURCE = /\.(ts|vue|mjs|js|css)$/
const SKIP = [
  /(^|\/)generated(\/|\.ts$)/,
  /^contracts\//,
  /^packages\/[a-z-]+-api\/src\//,
  /\.d\.ts$/,
  /(^|\/)dist\//,
]
const DIRECTIVES = [
  /^\/\/ @vitest-environment /,
  /^\/\/ @ts-expect-error \S/,
  /^\/\* @vite-ignore \*\//,
  /^<!-- eslint-(disable|enable) vue\/no-v-html/,
  /^<!-- @(fallthroughAttributes|strictTemplates) (true|false) -->$/,
]

export function commentLines(source, path) {
  const found = []
  source.split('\n').forEach((line, index) => {
    const text = line.trim()
    const comment =
      text.startsWith('//') ||
      text.startsWith('/*') ||
      (path.endsWith('.vue') && text.startsWith('<!--'))
    if (comment && !DIRECTIVES.some((directive) => directive.test(text))) {
      found.push({ line: index + 1, text })
    }
  })
  return found
}

export function commentedFiles(files, read) {
  return files
    .filter(
      (path) => SOURCE.test(path) && !SKIP.some((rule) => rule.test(path)),
    )
    .flatMap((path) =>
      commentLines(read(path), path).map((hit) => ({ path, ...hit })),
    )
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
  const hits = commentedFiles(files, (path) => readFileSync(path, 'utf8'))
  for (const hit of hits) console.error(`${hit.path}:${hit.line}: ${hit.text}`)
  if (hits.length > 0) process.exit(1)
  console.log('no comments')
}
