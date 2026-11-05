import { existsSync, readFileSync } from 'node:fs'

export function changelogSection(text, version) {
  const lines = text.split('\n')
  const start = lines.findIndex((line) => line.trim() === `## ${version}`)
  if (start === -1) return `Release ${version}`
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => line.startsWith('## '))
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim()
}

if (import.meta.main) {
  const [file, version] = process.argv.slice(2)
  const text = existsSync(file) ? readFileSync(file, 'utf8') : ''
  console.log(changelogSection(text, version))
}
