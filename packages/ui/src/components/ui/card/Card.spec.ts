// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './index'

const classes = (w: ReturnType<typeof mount>) => w.classes()

describe('Card family', () => {
  it('uses the Mira spacing without props', () => {
    expect(classes(mount(Card))).toEqual(
      expect.arrayContaining(['gap-4', 'py-4', 'ring-1', 'rounded-md', 'flex', 'flex-col']),
    )
    expect(classes(mount(CardHeader))).toEqual(
      expect.arrayContaining(['grid', 'px-4', 'gap-1']),
    )
    expect(classes(mount(CardTitle))).toEqual(
      expect.arrayContaining(['leading-none', 'font-medium']),
    )
    expect(classes(mount(CardTitle))).not.toContain('font-semibold')
    expect(classes(mount(CardTitle, { props: { size: 'lg' } }))).toEqual(
      expect.arrayContaining(['text-xl', 'font-semibold']),
    )
    expect(classes(mount(CardTitle))).not.toContain('text-base')
    expect(classes(mount(CardContent))).toContain('px-4')
  })

  it('has a compact size', () => {
    const c = classes(mount(Card, { props: { size: 'sm' } }))
    expect(c).toEqual(expect.arrayContaining(['gap-3', 'py-3']))
  })

  it('removes the gap and the padding on request', () => {
    const c = classes(mount(Card, { props: { gap: 'none', variant: 'flat' } }))
    expect(c).toEqual(expect.arrayContaining(['gap-0', 'py-0']))
    expect(c).not.toContain('gap-4')
    expect(c).not.toContain('shadow-sm')
    expect(c).toContain('bg-muted')
    expect(c).not.toContain('bg-card')
  })

  it('lets a caller class win over the gap prop without duplicates', () => {
    const c = classes(mount(Card, { props: { class: 'gap-2' } }))
    expect(c).toContain('gap-2')
    expect(c).not.toContain('gap-4')
  })

  it('uses the standard header', () => {
    const c = classes(mount(CardHeader, { props: { standard: true } }))
    expect(c).toEqual(
      expect.arrayContaining([
        'flex',
        'min-h-[var(--control-h-lg,2rem)]',
        'items-center',
        'justify-between',
        'border-b',
        'px-4',
        'py-0.5',
        'bg-muted/30',
      ]),
    )
    expect(c).not.toContain('grid')
  })

  it('uses the Mira footer without props', () => {
    const c = classes(mount(CardFooter))
    expect(c).toEqual(expect.arrayContaining(['flex', 'items-center', 'px-4']))
    expect(c).not.toContain('bg-muted/30')
  })

  it('uses the standard footer with the same tint as the header', () => {
    const c = classes(mount(CardFooter, { props: { standard: true } }))
    expect(c).toEqual(
      expect.arrayContaining([
        'flex',
        'min-h-[var(--control-h-lg,2rem)]',
        'items-center',
        'justify-end',
        'gap-2',
        'border-t',
        'bg-muted/30',
        'px-4',
        'py-0.5',
      ]),
    )
  })

  it('gives the standard header and footer the same 32px height token', () => {
    const header = classes(mount(CardHeader, { props: { standard: true } }))
    const footer = classes(mount(CardFooter, { props: { standard: true } }))
    expect(header).toContain('min-h-[var(--control-h-lg,2rem)]')
    expect(footer).toContain('min-h-[var(--control-h-lg,2rem)]')
  })

  it('sizes the title', () => {
    expect(classes(mount(CardTitle, { props: { size: 'md' } }))).toContain(
      'text-[length:var(--text-control,0.75rem)]',
    )
    expect(classes(mount(CardTitle, { props: { size: 'lg' } }))).toContain('text-xl')
  })

  it('pads the content by variant', () => {
    expect(classes(mount(CardContent, { props: { variant: 'standard' } }))).toEqual(
      expect.arrayContaining(['p-4']),
    )
    expect(classes(mount(CardContent, { props: { variant: 'standard' } }))).not.toContain('sm:p-6')
    expect(classes(mount(CardContent, { props: { variant: 'flush' } }))).toContain('p-0')
  })
})
