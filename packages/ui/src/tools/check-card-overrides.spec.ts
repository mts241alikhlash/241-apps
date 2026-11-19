import { describe, expect, it } from 'vitest'
import {
  findCardOverrides,
  findOffScaleSpacing,
  findRawPalette,
} from './check-card-overrides.mjs'

describe('findCardOverrides', () => {
  it('flags gap-0 and py-0 on Card', () => {
    expect(
      findCardOverrides('<Card class="gap-0 py-0 shadow-none">'),
    ).toHaveLength(1)
  })

  it('flags font sizes on CardTitle and CardHeader across lines', () => {
    const src = `<CardTitle\n  class="text-2xl font-bold"\n>`
    expect(findCardOverrides(src)).toEqual([
      { tag: 'CardTitle', className: 'text-2xl font-bold' },
    ])
    expect(
      findCardOverrides('<CardHeader class="px-6 py-5 text-lg">'),
    ).toHaveLength(1)
  })

  it('flags background overrides on CardHeader and CardFooter only', () => {
    expect(
      findCardOverrides('<CardHeader class="border-b bg-muted/15">'),
    ).toHaveLength(1)
    expect(
      findCardOverrides('<CardFooter class="bg-background">'),
    ).toHaveLength(1)
    expect(findCardOverrides('<Card class="bg-card">')).toHaveLength(0)
  })

  it('ignores other components and clean cards', () => {
    expect(findCardOverrides('<Button class="gap-0">')).toHaveLength(0)
    expect(findCardOverrides('<CardContent class="p-4 text-sm">')).toHaveLength(
      1,
    )
    expect(findCardOverrides('<Button class="gap-0">')).toHaveLength(0)
    expect(
      findCardOverrides('<Card gap="none" class="max-w-md">'),
    ).toHaveLength(0)
    expect(findCardOverrides('<CardTitle size="lg">')).toHaveLength(0)
  })
})

describe('spacing scale', () => {
  it('accepts the steps 0.5, 1, 1.5, 2, 3, 4 and 6', () => {
    expect(
      findOffScaleSpacing(
        '<div class="space-y-0.5 space-y-1 space-y-1.5 space-y-2 space-y-3 space-y-4 space-y-6 gap-0 gap-1 gap-1.5 gap-2 gap-3 gap-4 gap-6">',
      ),
    ).toHaveLength(0)
  })

  it('reports a step outside the scale', () => {
    expect(findOffScaleSpacing('<div class="space-y-5">')).toEqual([
      { value: 'space-y-5' },
    ])
    expect(findOffScaleSpacing('<div class="gap-16">')).toEqual([
      { value: 'gap-16' },
    ])
  })
})

describe('raw palette', () => {
  it('reports a Tailwind palette class', () => {
    expect(findRawPalette('<div class="text-amber-600">')).toEqual([
      { value: 'text-amber-600' },
    ])
    expect(findRawPalette('<div class="bg-emerald-50/40">')).toEqual([
      { value: 'bg-emerald-50/40' },
    ])
  })

  it('accepts a status token and skips an exempt surface', () => {
    expect(
      findRawPalette('<div class="text-success bg-warning/10">'),
    ).toHaveLength(0)
    expect(
      findRawPalette('<div class="bg-amber-950">', { exempt: true }),
    ).toHaveLength(0)
  })
})
