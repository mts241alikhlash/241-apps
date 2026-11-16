#!/usr/bin/env node
import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const TAG =
  /<(Card|CardHeader|CardFooter|CardTitle|CardContent)\b[^>]*?\bclass="([^"]*)"/g
const OVERRIDE =
  /(^|\s)(gap-0|py-0|p-[68]|px-[56]|text-(xs|sm|base|lg|xl|2xl|3xl))(?=\s|$)/
const BACKGROUND = /(^|\s)bg-[^\s]+/

const SPACING =
  /(^|[\s"'])(space-y-(2\.5|3\.5|5|8|10|12)|gap-(2\.5|5|8|10|16))(?=[\s"']|$)/g

export function findOffScaleSpacing(source) {
  const found = []
  for (const match of source.matchAll(SPACING)) {
    found.push({ value: match[2] })
  }
  return found
}

const RAW_PALETTE =
  /(^|[\s"'])(text|bg|border|ring|from|to|via|outline)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}(\/[0-9]{1,3})?(?=[\s"']|$)/g

export function findRawPalette(source, { exempt = false } = {}) {
  if (exempt) return []
  const found = []
  for (const match of source.matchAll(RAW_PALETTE)) {
    found.push({ value: match[0].replace(/^[\s"']+/, '').trim() })
  }
  return found
}

export function findCardOverrides(source) {
  const found = []
  for (const match of source.matchAll(TAG)) {
    const className = match[2].trim()
    const tintable = match[1] === 'CardHeader' || match[1] === 'CardFooter'
    if (OVERRIDE.test(className) || (tintable && BACKGROUND.test(className))) {
      found.push({ tag: match[1], className })
    }
  }
  return found
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (name === 'node_modules') return []
    return statSync(path).isDirectory()
      ? walk(path)
      : /\.(vue|ts)$/.test(path)
        ? [path]
        : []
  })
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  const root = process.argv[2] ?? 'src'
  let count = 0
  for (const file of walk(root)) {
    const source = readFileSync(file, 'utf8')
    const exempt = /\/(landing|kiosk)\//.test(file)
    for (const hit of findCardOverrides(source)) {
      console.log(`${file}: ${hit.tag} class="${hit.className}"`)
      count += 1
    }
    for (const hit of findOffScaleSpacing(source)) {
      console.log(`${file}: off-scale ${hit.value}`)
      count += 1
    }
    for (const hit of findRawPalette(source, { exempt })) {
      console.log(`${file}: raw palette ${hit.value}`)
      count += 1
    }
  }
  process.exit(count > 0 ? 1 : 0)
}
