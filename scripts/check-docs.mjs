import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const HEADINGS = [
  'Purpose',
  'Depends on',
  'Rules specific to this package',
  'Gotchas',
  'Open work',
]
const AGENTS_MAX_LINES = 40
const SHAPE_PACKAGES = 'none'

function stripFences(text) {
  let fenced = false
  return text
    .split('\n')
    .filter((line) => {
      if (/^\s*```/.test(line)) {
        fenced = !fenced
        return false
      }
      return !fenced
    })
    .join('\n')
}

export function brokenLinks(files, exists) {
  const problems = []
  for (const { path: file, text } of files) {
    const body = stripFences(text)
    for (const m of body.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1]
      if (/^(https?:|mailto:|#)/.test(target)) continue
      const clean = target.split('#')[0]
      if (!clean) continue
      const resolved = path.posix.normalize(
        path.posix.join(path.posix.dirname(file), clean),
      )
      if (!exists(resolved)) problems.push(`${file}: ${target}`)
    }
  }
  return problems
}

export function serverFacts(file, text) {
  const problems = []
  for (const m of text.matchAll(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/g)) {
    if (m[1] !== '127.0.0.1' && m[1] !== '0.0.0.0') {
      problems.push(`${file}: IPv4 literal ${m[1]}`)
    }
  }
  return problems
}

export function packageShape(dir, files) {
  const problems = []
  const readme = files['README.md']
  if (typeof readme !== 'string') problems.push(`${dir}: README.md missing`)
  else {
    const found = [...stripFences(readme).matchAll(/^## (.+)$/gm)].map((m) =>
      m[1].trim(),
    )
    if (found.join('|') !== HEADINGS.join('|')) {
      problems.push(
        `${dir}/README.md: headings must be exactly ${HEADINGS.join(', ')} (found ${found.join(', ') || 'none'})`,
      )
    }
  }
  const agents = files['AGENTS.md']
  if (typeof agents !== 'string') problems.push(`${dir}: AGENTS.md missing`)
  else if (agents.split('\n').length - 1 > AGENTS_MAX_LINES) {
    problems.push(`${dir}/AGENTS.md: over ${AGENTS_MAX_LINES} lines`)
  }
  const claude = files['CLAUDE.md']
  if (claude?.symlink !== 'AGENTS.md') {
    problems.push(`${dir}/CLAUDE.md: must be a symlink to AGENTS.md`)
  }
  return problems
}

function listMarkdown() {
  const out = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '*.md'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  return out
    .split('\n')
    .filter((f) => f && !f.endsWith('CHANGELOG.md') && fs.existsSync(f))
}

function packageDirs() {
  const dirs = ['infra']
  for (const group of ['apps', 'services', 'packages']) {
    for (const e of fs.readdirSync(group, { withFileTypes: true })) {
      if (
        e.isDirectory() &&
        fs.existsSync(path.join(group, e.name, 'package.json'))
      ) {
        dirs.push(`${group}/${e.name}`)
      }
    }
  }
  return dirs
}

function readPackageFiles(dir) {
  const files = {}
  for (const name of ['README.md', 'AGENTS.md', 'CLAUDE.md']) {
    const p = path.join(dir, name)
    let st
    try {
      st = fs.lstatSync(p)
    } catch {
      continue
    }
    files[name] = st.isSymbolicLink()
      ? { symlink: fs.readlinkSync(p) }
      : fs.readFileSync(p, 'utf8')
  }
  return files
}

if (import.meta.main) {
  const only = process.argv.slice(2)
  const names = only.length ? only : listMarkdown()
  const files = names.map((f) => ({
    path: f,
    text: fs.readFileSync(f, 'utf8'),
  }))
  const problems = [
    ...brokenLinks(files, (p) => fs.existsSync(p)),
    ...files.flatMap((f) => serverFacts(f.path, f.text)),
  ]
  if (!only.length && SHAPE_PACKAGES === 'all') {
    for (const dir of packageDirs()) {
      problems.push(...packageShape(dir, readPackageFiles(dir)))
    }
  }
  for (const p of problems) console.error(p)
  if (problems.length) process.exit(1)
  console.log(`docs ok: ${files.length} files`)
}
