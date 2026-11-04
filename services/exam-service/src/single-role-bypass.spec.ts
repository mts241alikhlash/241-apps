import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { glob } from 'node:fs/promises'

const SRC = join(process.cwd(), 'src')

const ALLOWED = new Map<string, string>()

async function sourceFiles(): Promise<string[]> {
  const files: string[] = []
  for await (const entry of glob('**/*.ts', { cwd: SRC })) {
    if (!entry.endsWith('.spec.ts')) files.push(entry.replace(/\\/g, '/'))
  }
  return files
}

describe('the role-name bypass is not copied (ADR-0011)', () => {
  let sources: { path: string; text: string }[]

  beforeAll(async () => {
    const files = await sourceFiles()
    sources = await Promise.all(
      files.map(async (path) => ({
        path,
        text: await readFile(join(SRC, path), 'utf8'),
      })),
    )
  }, 60_000)

  it('finds source files to check', () => {
    expect(sources.length).toBeGreaterThan(50)
  })

  it('names SUPER_ADMIN only where the allowlist accounts for it', () => {
    const offenders = sources
      .filter((source) => !ALLOWED.has(source.path))
      .filter((source) =>
        source.text
          .split('\n')
          .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
          .some((line) => line.includes('SUPER_ADMIN')),
      )
      .map((source) => source.path)

    expect(offenders).toEqual([])
  })

  it('allows nothing that has since moved', () => {
    const paths = new Set(sources.map((source) => source.path))
    const stale = [...ALLOWED.keys()].filter((path) => !paths.has(path))

    expect(stale).toEqual([])
  })
})
