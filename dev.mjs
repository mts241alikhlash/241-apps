#!/usr/bin/env node

import { spawn, execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const workspace = path.dirname(fileURLToPath(import.meta.url))
const servicesRoot = workspace

const WEB_PORTS = {
  academic: 5173,
  inventory: 5174,
  admission: 5175,
  portal: 5176,
  hr: 5177,
  admin: 5178,
  assessment: 5179,
  account: 5180,
  exam: 5181,
}
const SERVICE_PORTS = {
  identity: 3000,
  academic: 3200,
  inventory: 3300,
  presence: 3400,
  portal: 3600,
  admission: 3700,
  hr: 3800,
  student: 3900,
  assessment: 4000,
  exam: 4100,
}

const apps = process.argv.slice(2)
if (apps.length === 0 || apps.some((app) => !(app in WEB_PORTS))) {
  console.error(
    `Usage: node dev.mjs <app> [app...]\nApps: ${Object.keys(WEB_PORTS).join(', ')}`,
  )
  process.exit(1)
}

function readEnv(file) {
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => /^[A-Z_][A-Z0-9_]*=/.test(line))
      .map((line) => {
        const at = line.indexOf('=')
        return [line.slice(0, at), line.slice(at + 1).replace(/^["']|["']$/g, '')]
      }),
  )
}

const envFile = (service) =>
  path.join(servicesRoot, 'services', `${service}-service`, '.env')

const identityEnv = readEnv(envFile('identity'))

function databaseUrl(service) {
  const url = new URL(identityEnv.DATABASE_URL)
  url.pathname = `/${service}`
  return url.toString()
}

function ensureEnv(service) {
  const file = envFile(service)
  if (existsSync(file)) return
  const overrides = {
    DATABASE_URL: databaseUrl(service),
    DIRECT_URL: databaseUrl(service),
    NODE_ENV: 'development',
    PORT: String(SERVICE_PORTS[service]),
    JWT_SECRET: identityEnv.JWT_SECRET,
    PROVISIONING_SERVICE_TOKEN: identityEnv.PROVISIONING_SERVICE_TOKEN,
    FRONTEND_URL: identityEnv.FRONTEND_URL,
    ...Object.fromEntries(
      Object.entries(SERVICE_PORTS).map(([name, port]) => [
        `${name.toUpperCase()}_SERVICE_URL`,
        `http://localhost:${port}`,
      ]),
    ),
  }
  const example = readFileSync(`${file}.example`, 'utf8').split('\n')
  const lines = example.map((line) => {
    const key = line.match(/^([A-Z_][A-Z0-9_]*)=/)?.[1]
    return key && key in overrides ? `${key}=${overrides[key]}` : line
  })
  writeFileSync(file, lines.join('\n'), { mode: 0o600 })
  console.log(`created ${path.relative(workspace, file)}`)
}

async function ensureDatabase(service) {
  const fromIdentity = createRequire(
    path.join(servicesRoot, 'services/identity-service/package.json'),
  )
  const { Client } = createRequire(fromIdentity.resolve('@prisma/adapter-pg'))('pg')
  const admin = new URL(identityEnv.DATABASE_URL)
  admin.pathname = '/postgres'
  admin.searchParams.delete('sslmode')
  const client = new Client({ connectionString: admin.toString() })
  await client.connect()
  try {
    const name = service
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name])
    if (found.rowCount === 0) {
      await client.query(`CREATE DATABASE "${name}"`)
      console.log(`created database ${name}`)
    }
  } finally {
    await client.end()
  }
}

function listening(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

async function portBusy(port) {
  return (await listening(port, '127.0.0.1')) || (await listening(port, '::1'))
}

async function servicesOf(app) {
  const config = path.join(workspace, 'apps', `${app}-web`, 'api-routes.config.ts')
  const { SERVICE_PREFIXES } = await import(pathToFileURL(config).href)
  return Object.keys(SERVICE_PREFIXES)
}

const services = new Set(['identity'])
for (const app of apps) for (const service of await servicesOf(app)) services.add(service)
const webs = new Set(['account', ...apps])

const children = new Set()
const COLORS = [36, 33, 35, 32, 34, 31, 96, 93, 95, 92]
let colorIndex = 0
let stopping = false

function run(label, command, args, cwd) {
  const color = COLORS[colorIndex++ % COLORS.length]
  const prefix = `\x1b[${color}m[${label}]\x1b[0m `
  const start = () => {
    const child = spawn(command, args, { cwd, detached: true, env: process.env })
    for (const stream of [child.stdout, child.stderr]) {
      let pending = ''
      stream.on('data', (chunk) => {
        pending += chunk.toString()
        const lines = pending.split('\n')
        pending = lines.pop() ?? ''
        for (const line of lines) process.stdout.write(prefix + line + '\n')
      })
    }
    child.on('exit', (code) => {
      children.delete(child)
      process.stdout.write(`${prefix}exited (${code})\n`)
      if (stopping) return
      process.stdout.write(`${prefix}restarting in 2s\n`)
      setTimeout(start, 2000)
    })
    children.add(child)
  }
  start()
}

const STORAGE = [
  { port: Number(new URL(identityEnv.DATABASE_URL).port || 5432), container: /^241-apps[-_]postgres[-_]1$/, label: 'Postgres' },
  { port: 9000, container: /^241-apps[-_]s3[-_]1$/, label: 'S3' },
]

function containerOnPort(port) {
  const rows = execFileSync('docker', ['ps', '--format', '{{.Names}}\t{{.Ports}}'], {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
  const row = rows.find((r) => r.split('\t')[1]?.includes(`:${port}->`))
  return row ? row.split('\t')[0] : ''
}

let startStorage = false
for (const { port, container, label } of STORAGE) {
  if (!(await portBusy(port))) {
    startStorage = true
    continue
  }
  const owner = containerOnPort(port)
  if (!container.test(owner)) {
    console.error(
      `:${port} is busy with ${owner ? `container ${owner}` : 'a process that is not a container'}, not the 241-apps ${label} container. Stop it first so ${label} can run from infra/compose/compose.yaml.`,
    )
    process.exit(1)
  }
}
if (startStorage) {
  console.log('starting the local Postgres and S3 (compose profile storage)')
  execFileSync(
    'docker',
    [
      'compose',
      '-f',
      path.join(workspace, 'infra/compose/compose.yaml'),
      '--profile',
      'storage',
      'up',
      '-d',
      '--wait',
      'postgres',
      's3',
    ],
    { stdio: 'inherit' },
  )
}

execFileSync('pnpm', ['--filter', '@mts241alikhlash/nest-core', 'run', 'build'], {
  cwd: workspace,
  stdio: ['ignore', 'ignore', 'inherit'],
})
run('nest-core', 'pnpm', ['--filter', '@mts241alikhlash/nest-core', 'run', 'dev'], workspace)

for (const service of services) {
  if (await portBusy(SERVICE_PORTS[service])) {
    console.log(`${service}-service already on :${SERVICE_PORTS[service]}, skipping`)
    continue
  }
  ensureEnv(service)
  await ensureDatabase(service)
  execFileSync('pnpm', ['--filter', `${service}-service`, 'exec', 'prisma', 'migrate', 'deploy'], {
    cwd: servicesRoot,
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  run(`${service}-service`, 'pnpm', ['--filter', `${service}-service`, 'run', 'start:dev'], servicesRoot)
}

for (const web of webs) {
  if (await portBusy(WEB_PORTS[web])) {
    console.log(`${web}-web already on :${WEB_PORTS[web]}, skipping`)
    continue
  }
  run(
    `${web}-web`,
    'pnpm',
    ['dev', '--port', String(WEB_PORTS[web]), '--strictPort'],
    path.join(workspace, 'apps', `${web}-web`),
  )
}

console.log(
  `\nOpen http://localhost:${WEB_PORTS[apps[0]]} and sign in at http://localhost:${WEB_PORTS.account}. Ctrl+C stops everything.\n`,
)

function stop() {
  stopping = true
  for (const child of children) {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      continue
    }
  }
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
