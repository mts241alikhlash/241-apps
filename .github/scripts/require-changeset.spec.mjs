import assert from 'node:assert/strict'
import test from 'node:test'
import { hasFrontmatter, checkChangesets } from './require-changeset.mjs'

const packages = [
  { name: 'hr-service', dir: 'services/hr-service', version: '0.3.1' },
  { name: 'hr-web', dir: 'apps/hr-web', version: '1.2.0' },
]
const run = (files, changesets = [], branch = 'feat/x') =>
  checkChangesets({ files, packages, changesets, branch })

test('a package change without a changeset fails naming the package', () => {
  const out = run(['services/hr-service/src/a.ts'])
  assert.equal(out.length, 1)
  assert.match(out[0], /hr-service/)
})

test('a changeset that lists the package passes', () => {
  assert.deepEqual(
    run(['services/hr-service/src/a.ts'], [{ 'hr-service': 'patch' }]),
    [],
  )
})

test('markdown, docs, specs and the changeset readme need none', () => {
  assert.deepEqual(
    run([
      'services/hr-service/README.md',
      'docs/guides/x.md',
      'services/hr-service/src/a.spec.ts',
      '.changeset/README.md',
    ]),
    [],
  )
})

test('a major bump below 1.0.0 is refused', () => {
  const out = run(['services/hr-service/src/a.ts'], [{ 'hr-service': 'major' }])
  assert.equal(out.length, 1)
  assert.match(out[0], /major/)
})

test('a major bump from 1.0.0 passes', () => {
  assert.deepEqual(run(['apps/hr-web/src/a.ts'], [{ 'hr-web': 'major' }]), [])
})

test('a lockfile change alone needs none', () => {
  assert.deepEqual(run(['pnpm-lock.yaml']), [])
})

test('a dependabot branch is exempt from the missing changeset', () => {
  assert.deepEqual(
    run(['services/hr-service/package.json'], [], 'dependabot/npm_and_yarn/x'),
    [],
  )
})

test('files outside every package need none', () => {
  assert.deepEqual(run(['scripts/affected.mjs', '.github/workflows/a.yml']), [])
})

test('the Release pull request branch is exempt: it consumes the changesets', () => {
  assert.deepEqual(
    run(
      ['services/hr-service/package.json', 'services/hr-service/CHANGELOG.md'],
      [],
      'changeset-release/main',
    ),
    [],
  )
})

test('the lock pull request branch is exempt: it only pins digests', () => {
  assert.deepEqual(
    run(
      [
        'infra/package.json',
        'infra/deployment/lock.json',
        'infra/compose/compose.yaml',
      ],
      [],
      'chore/update-lock',
    ),
    [],
  )
})

test('another chore branch is not exempt', () => {
  assert.equal(
    run(['services/hr-service/src/a.ts'], [], 'chore/other').length,
    1,
  )
})

test('a changeset without its opening frontmatter line is refused', () => {
  assert.equal(hasFrontmatter("'exam-service': patch\n---\n\nText.\n"), false)
  assert.equal(
    hasFrontmatter("---\n'exam-service': patch\n---\n\nText.\n"),
    true,
  )
})
