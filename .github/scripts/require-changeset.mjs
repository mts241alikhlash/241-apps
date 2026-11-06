import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const EXEMPT = [
  /\.md$/,
  /^docs\//,
  /\.spec\.(ts|mjs)$/,
  /^pnpm-lock\.yaml$/,
  /^\.changeset\//,
]

export function parseChangesetBumps(text) {
  const front = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ''
  const bumps = {}
  for (const line of front.split(/\r?\n/)) {
    const m = line.match(
      /^\s*['"]?(@?[\w./-]+)['"]?\s*:\s*(major|minor|patch)\s*$/,
    )
    if (m) bumps[m[1]] = m[2]
  }
  return bumps
}

export function checkChangesets({ files, packages, changesets, branch }) {
  const problems = []
  const byName = new Map(packages.map((p) => [p.name, p]))
  const listed = new Set()
  for (const set of changesets) {
    for (const [name, bump] of Object.entries(set)) {
      listed.add(name)
      const pkg = byName.get(name)
      if (bump === 'major' && pkg && !/^[1-9]/.test(pkg.version)) {
        problems.push(
          `${name} is at ${pkg.version}: a major changeset is refused below 1.0.0, use minor`,
        )
      }
    }
  }
  if (branch.startsWith('dependabot/') || branch === 'changeset-release/main') {
    return problems
  }
  const touched = new Set()
  for (const file of files) {
    if (EXEMPT.some((re) => re.test(file))) continue
    const owner = packages
      .filter((p) => file === p.dir || file.startsWith(`${p.dir}/`))
      .sort((a, b) => b.dir.length - a.dir.length)[0]
    if (owner) touched.add(owner.name)
  }
  for (const name of touched) {
    if (!listed.has(name)) problems.push(`${name} changed without a changeset`)
  }
  return problems
}

function workspacePackages(root) {
  const out = execFileSync('pnpm', ['ls', '-r', '--json', '--depth', '-1'], {
    encoding: 'utf8',
    cwd: root,
  })
  return JSON.parse(out)
    .filter((p) => p.path !== root)
    .map((p) => ({
      name: p.name,
      dir: path.relative(root, p.path).replaceAll('\\', '/'),
      version: p.version,
    }))
}

function pendingChangesets(root) {
  const dir = path.join(root, '.changeset')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => parseChangesetBumps(readFileSync(path.join(dir, f), 'utf8')))
}

if (import.meta.main) {
  const [base, head] = process.argv.slice(2)
  if (!base || !head) {
    console.error('usage: require-changeset.mjs <base> <head>')
    process.exit(2)
  }
  const root = process.cwd()
  const files = execFileSync(
    'git',
    ['diff', '--name-only', `${base}...${head}`],
    {
      encoding: 'utf8',
    },
  )
    .split('\n')
    .filter(Boolean)
  const branch = process.env.CHANGESET_BRANCH ?? ''
  const problems = checkChangesets({
    files,
    packages: workspacePackages(root),
    changesets: pendingChangesets(root),
    branch,
  })
  for (const p of problems) console.error(p)
  if (problems.length) process.exit(1)
  console.log('changesets ok')
}
