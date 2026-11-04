import { z } from 'zod'
import type { LandingField } from './data/landingFormConfig'

const required = 'Wajib diisi.'
const tooLong = (max: number) => `Maksimal ${max} karakter.`

function fieldSchema(field: LandingField): z.ZodType {
  switch (field.kind) {
    case 'text': {
      const base = z.string().trim().max(field.max, tooLong(field.max))
      return field.optional ? base : base.min(1, required)
    }
    case 'lines':
      return z
        .array(
          z.string().trim().min(1, required).max(field.max, tooLong(field.max)),
        )
        .min(1, 'Isi minimal 1 baris.')
        .max(field.maxLines, `Maksimal ${field.maxLines} baris.`)
    case 'tags':
      return z
        .array(
          z.string().trim().min(1, required).max(field.max, tooLong(field.max)),
        )
        .max(field.maxItems, `Maksimal ${field.maxItems} label.`)
    case 'image': {
      const ref = z.union([
        z.object({ imageId: z.string().min(1) }),
        z.object({ src: z.string().min(1) }),
      ])
      return field.optional
        ? ref.nullable()
        : ref.nullable().refine((value) => value !== null, 'Pilih foto.')
    }
    case 'group':
      return buildSectionSchema(field.fields)
    case 'list':
      return z
        .array(buildSectionSchema(field.fields))
        .min(field.min, `Isi minimal ${field.min} ${field.itemNoun}.`)
        .max(field.max, `Maksimal ${field.max} ${field.itemNoun}.`)
  }
}

export function buildSectionSchema(fields: LandingField[]) {
  return z.object(
    Object.fromEntries(fields.map((field) => [field.name, fieldSchema(field)])),
  )
}

function itemChecks(
  fields: LandingField[],
  values: unknown,
  prefix: string,
  errors: Record<string, string>,
) {
  const node = (values ?? {}) as Record<string, unknown>
  for (const field of fields) {
    const at = prefix ? `${prefix}.${field.name}` : field.name
    if (field.kind === 'group') {
      itemChecks(field.fields, node[field.name], at, errors)
    } else if (field.kind === 'list') {
      const items = (node[field.name] as Record<string, unknown>[]) ?? []
      items.forEach((item, index) => {
        const found = field.itemCheck?.(item)
        const itemPath = `${at}.${index}`
        if (found && !(`${itemPath}.${found.path}` in errors)) {
          errors[`${itemPath}.${found.path}`] = found.message
        }
        itemChecks(field.fields, item, itemPath, errors)
      })
    }
  }
}

export function validateSection(
  fields: LandingField[],
  values: unknown,
): Record<string, string> {
  const errors: Record<string, string> = {}
  const result = buildSectionSchema(fields).safeParse(values)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join('.')
      if (!(path in errors)) errors[path] = issue.message
    }
  }
  itemChecks(fields, values, '', errors)
  return errors
}

export function cloneContent<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function getAt(root: unknown, path: string): unknown {
  return path
    .split('.')
    .filter(Boolean)
    .reduce<unknown>(
      (node, part) =>
        node === null || node === undefined
          ? undefined
          : (node as Record<string, unknown>)[part],
      root,
    )
}

export function setAt<T>(root: T, path: string, value: unknown): T {
  const next = cloneContent(root)
  const parts = path.split('.').filter(Boolean)
  const last = parts.pop()
  if (last === undefined) return value as T
  let node = next as Record<string, unknown>
  for (const part of parts) node = node[part] as Record<string, unknown>
  node[last] = value
  return next
}

function listAt(root: unknown, path: string): unknown[] {
  return (getAt(root, path) as unknown[]) ?? []
}

export function addItem<T>(root: T, path: string, blank: unknown): T {
  return setAt(root, path, [...listAt(root, path), cloneContent(blank)])
}

export function removeItem<T>(root: T, path: string, index: number): T {
  return setAt(
    root,
    path,
    listAt(root, path).filter((_, position) => position !== index),
  )
}

export function moveItem<T>(
  root: T,
  path: string,
  index: number,
  step: number,
): T {
  const items = [...listAt(root, path)]
  const target = index + step
  if (target < 0 || target >= items.length) return setAt(root, path, items)
  ;[items[index], items[target]] = [items[target], items[index]]
  return setAt(root, path, items)
}

export function toServerContent(
  fields: LandingField[],
  values: unknown,
): unknown {
  const walk = (list: LandingField[], node: Record<string, unknown>) => {
    const out: Record<string, unknown> = {}
    for (const field of list) {
      const value = node[field.name]
      if (field.kind === 'text') {
        const trimmed = typeof value === 'string' ? value.trim() : value
        out[field.name] = field.optional && trimmed === '' ? null : trimmed
      } else if (field.kind === 'group') {
        out[field.name] = walk(field.fields, value as Record<string, unknown>)
      } else if (field.kind === 'list') {
        out[field.name] = (value as Record<string, unknown>[]).map((item) =>
          walk(field.fields, item),
        )
      } else {
        out[field.name] = value
      }
    }
    return out
  }
  return walk(fields, values as Record<string, unknown>)
}

export function toFormContent<T>(fields: LandingField[], content: T): T {
  const walk = (list: LandingField[], node: Record<string, unknown>) => {
    const out: Record<string, unknown> = { ...node }
    for (const field of list) {
      const value = node[field.name]
      if (field.kind === 'text') {
        out[field.name] = value ?? ''
      } else if (field.kind === 'group') {
        out[field.name] = walk(field.fields, value as Record<string, unknown>)
      } else if (field.kind === 'list') {
        out[field.name] = ((value as Record<string, unknown>[]) ?? []).map(
          (item) => walk(field.fields, item),
        )
      }
    }
    return out
  }
  return cloneContent(walk(fields, content as Record<string, unknown>)) as T
}
