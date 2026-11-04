import { describe, expect, it } from 'vitest'
import { findCardOverrides } from './check-card-overrides.mjs'

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
    expect(findCardOverrides('<CardFooter class="bg-background">')).toHaveLength(
      1,
    )
    expect(findCardOverrides('<Card class="bg-card">')).toHaveLength(0)
  })

  it('ignores CardContent, other components and clean cards', () => {
    expect(
      findCardOverrides('<CardContent class="py-0 text-sm">'),
    ).toHaveLength(0)
    expect(findCardOverrides('<Button class="gap-0">')).toHaveLength(0)
    expect(
      findCardOverrides('<Card gap="none" class="max-w-md">'),
    ).toHaveLength(0)
    expect(findCardOverrides('<CardTitle size="lg">')).toHaveLength(0)
  })
})
