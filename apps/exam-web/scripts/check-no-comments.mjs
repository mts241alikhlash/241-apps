#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const TARGETS = ['src', 'packages']
const ROOT_FILES = [
  'vite.config.ts',
  'vitest.config.ts',
  'api-routes.config.ts',
  'eslint.config.mjs',
  'eslint.typecheck.config.mjs',
]
const EXTENSIONS = new Set(['.ts', '.vue', '.css', '.mjs'])
const SKIPPED = [/^src\/generated\//, /^packages\/[^/]+\/src\/generated\.ts$/]

const DIRECTIVES = [
  /^\s*\/\/\/\s*<reference\b/,
  /^\s*\/\/\s*@vitest-environment\b/,
]

function isDirective(sourceLine, column) {
  if (!DIRECTIVES.some((pattern) => pattern.test(sourceLine))) return false
  const offset = sourceLine.length - sourceLine.trimStart().length
  return column - 1 === offset
}

const REGEX_PRECEDERS = new Set([
  '(',
  ',',
  '=',
  ':',
  '[',
  '!',
  '&',
  '|',
  '?',
  '{',
  '}',
  ';',
  '+',
  '-',
  '*',
  '%',
  '<',
  '>',
  '~',
  '^',
])

const REGEX_KEYWORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'case',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'throw',
  'else',
  'do',
  'yield',
  'await',
])

const CLOSERS = { '`': '`', "'": "'", '"': '"' }

function isWordChar(char) {
  return /[A-Za-z0-9_$]/.test(char)
}

function lastSignificant(text, index) {
  let i = index - 1
  while (i >= 0 && /\s/.test(text[i])) i -= 1
  if (i < 0) return { char: '', word: '' }
  if (isWordChar(text[i])) {
    let start = i
    while (start > 0 && isWordChar(text[start - 1])) start -= 1
    return { char: '', word: text.slice(start, i + 1) }
  }
  return { char: text[i], word: '' }
}

function startsRegex(text, index) {
  const { char, word } = lastSignificant(text, index)
  if (!char && !word) return true
  if (word) return REGEX_KEYWORDS.has(word)
  return REGEX_PRECEDERS.has(char)
}

export function scanJavaScript(text) {
  const hits = []
  const stack = []
  const interpDepths = []
  let index = 0

  while (index < text.length) {
    const char = text[index]
    const next = text[index + 1]
    const mode = stack[stack.length - 1]

    if (mode === '`') {
      if (char === '\\') {
        index += 2
        continue
      }
      if (char === '`') {
        stack.pop()
        index += 1
        continue
      }
      if (char === '$' && next === '{') {
        stack.push('interp')
        interpDepths.push(0)
        index += 2
        continue
      }
      index += 1
      continue
    }

    if (mode === "'" || mode === '"') {
      if (char === '\\') {
        index += 2
        continue
      }
      if (char === CLOSERS[mode]) {
        stack.pop()
        index += 1
        continue
      }
      index += 1
      continue
    }

    if (mode === 'regex') {
      if (char === '\\') {
        index += 2
        continue
      }
      if (char === '[') {
        stack.push('class')
        index += 1
        continue
      }
      if (char === '/') {
        stack.pop()
        index += 1
        continue
      }
      index += 1
      continue
    }

    if (mode === 'class') {
      if (char === '\\') {
        index += 2
        continue
      }
      if (char === ']') {
        stack.pop()
        index += 1
        continue
      }
      index += 1
      continue
    }

    if (mode === 'interp') {
      if (char === '{') {
        interpDepths[interpDepths.length - 1] += 1
        index += 1
        continue
      }
      if (char === '}') {
        if (interpDepths[interpDepths.length - 1] === 0) {
          stack.pop()
          interpDepths.pop()
        } else {
          interpDepths[interpDepths.length - 1] -= 1
        }
        index += 1
        continue
      }
    }

    if (char === '/' && next === '/') {
      const end = text.indexOf('\n', index)
      const stop = end === -1 ? text.length : end
      hits.push({ index, end: stop, kind: 'line' })
      index = stop
      continue
    }

    if (char === '/' && next === '*') {
      const end = text.indexOf('*/', index + 2)
      const stop = end === -1 ? text.length : end + 2
      hits.push({ index, end: stop, kind: 'block' })
      index = stop
      continue
    }

    if (char === '`' || char === "'" || char === '"') {
      stack.push(char)
      index += 1
      continue
    }

    if (char === '/' && startsRegex(text, index)) {
      stack.push('regex')
      index += 1
      continue
    }

    index += 1
  }

  return hits
}

export function scanCss(text) {
  const hits = []
  let index = 0

  while (index < text.length) {
    const char = text[index]
    if (char === '"' || char === "'") {
      let i = index + 1
      while (i < text.length && text[i] !== char) {
        if (text[i] === '\\') i += 1
        i += 1
      }
      index = i + 1
      continue
    }
    if (char === '/' && text[index + 1] === '*') {
      const end = text.indexOf('*/', index + 2)
      const stop = end === -1 ? text.length : end + 2
      hits.push({ index, end: stop, kind: 'block' })
      index = stop
      continue
    }
    index += 1
  }

  return hits
}

function scanHtml(text) {
  const hits = []
  const re = /<!--([\s\S]*?)-->/g
  let match
  while ((match = re.exec(text)) !== null) {
    hits.push({
      index: match.index,
      end: match.index + match[0].length,
      kind: 'html',
    })
  }
  return hits
}

export function scanSource(file, text) {
  if (file.endsWith('.css')) return scanCss(text)
  if (!file.endsWith('.vue')) return scanJavaScript(text)

  const hits = []
  const blocks = /<(script|style)\b[^>]*>([\s\S]*?)<\/\1>/g
  const gaps = []
  let cursor = 0
  let match

  while ((match = blocks.exec(text)) !== null) {
    gaps.push([cursor, match.index])
    cursor = match.index + match[0].length
    const innerStart = match.index + match[0].indexOf('>') + 1
    const inner = match[2]
    const found = match[1] === 'style' ? scanCss(inner) : scanJavaScript(inner)
    for (const hit of found) {
      hits.push({
        index: hit.index + innerStart,
        end: hit.end + innerStart,
        kind: hit.kind,
      })
    }
  }
  gaps.push([cursor, text.length])

  for (const [start, end] of gaps) {
    for (const hit of scanHtml(text.slice(start, end))) {
      hits.push({
        index: hit.index + start,
        end: hit.end + start,
        kind: hit.kind,
      })
    }
  }

  return hits.sort((a, b) => a.index - b.index)
}

function lineStarts(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') starts.push(i + 1)
  }
  return starts
}

function locate(starts, index) {
  let low = 0
  let high = starts.length - 1
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (starts[mid] <= index) low = mid
    else high = mid - 1
  }
  return { line: low + 1, column: index - starts[low] + 1 }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full)))
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(full)
  }
  return files
}

async function collect() {
  const files = []
  for (const target of TARGETS) {
    const directory = path.join(ROOT, target)
    try {
      files.push(...(await walk(directory)))
    } catch {
      continue
    }
  }
  for (const file of ROOT_FILES) {
    files.push(path.join(ROOT, file))
  }
  return files
    .map((file) => path.relative(ROOT, file).split(path.sep).join('/'))
    .filter((file) => !SKIPPED.some((pattern) => pattern.test(file)))
    .sort()
}

export function scanText(file, text) {
  const findings = []
  const starts = lineStarts(text)
  for (const hit of scanSource(file, text)) {
    const { line, column } = locate(starts, hit.index)
    const lineStart = starts[line - 1]
    const lineEnd = text.indexOf('\n', lineStart)
    const sourceLine = text.slice(
      lineStart,
      lineEnd === -1 ? text.length : lineEnd,
    )
    if (isDirective(sourceLine, column)) continue
    findings.push({ file, line, column, kind: hit.kind })
  }
  return findings
}

export async function scanRepository() {
  const findings = []
  for (const file of await collect()) {
    const text = await readFile(path.join(ROOT, file), 'utf8')
    findings.push(...scanText(file, text))
  }
  return findings
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname)

if (invokedDirectly) {
  const findings = await scanRepository()
  if (findings.length === 0) {
    console.log('ok no comments')
    process.exit(0)
  }
  for (const finding of findings) {
    console.error(
      `${finding.file}:${finding.line}:${finding.column} ${finding.kind} comment`,
    )
  }
  console.error(`${findings.length} comment(s) found`)
  process.exit(1)
}
