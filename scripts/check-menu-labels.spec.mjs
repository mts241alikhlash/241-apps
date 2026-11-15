import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'

const MAX_LABEL = 26

export function menuLabels(source) {
  const block = /\n {2}menu: \{([\s\S]*?)\n {2}\},/u.exec(source)?.[1] ?? ''
  return [...block.matchAll(/(\w+): '([^']+)'/gu)].map((m) => ({
    key: m[1],
    text: m[2],
  }))
}

test('menuLabels reads the menu block only', () => {
  const source =
    "export default {\n  menu: {\n    a: 'Satu',\n  },\n  other: {\n    b: 'Dua',\n  },\n}"
  assert.deepEqual(menuLabels(source), [{ key: 'a', text: 'Satu' }])
})

test('every sidebar menu label fits one line of the global sidebar', () => {
  const long = []
  for (const app of readdirSync('apps').filter((name) =>
    name.endsWith('-web'),
  )) {
    const file = `apps/${app}/src/i18n/locales/id.ts`
    for (const { key, text } of menuLabels(readFileSync(file, 'utf8'))) {
      if (text.length > MAX_LABEL)
        long.push(`${app} menu.${key}: ${text} (${text.length})`)
    }
  }
  assert.deepEqual(long, [])
})
