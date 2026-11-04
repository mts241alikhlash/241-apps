// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Badge, badgeVariants } from './badge'
import { Button, buttonVariants } from './button'
import { Checkbox } from './checkbox'
import { Input } from './input'
import { Label } from './label'
import { NativeSelect } from './native-select'
import { Select, SelectTrigger } from './select'
import { Switch } from './switch'
import { Textarea } from './textarea'

const md = 'h-[var(--control-h-md,1.75rem)]'

describe('button', () => {
  it('default size reads the md control height, text and icon tokens', () => {
    const c = buttonVariants()
    expect(c).toContain(md)
    expect(c).toContain('text-[length:var(--text-control,0.75rem)]')
    expect(c).toContain('[&_svg:not([class*=size-])]:size-[var(--icon-control,0.875rem)]')
  })

  it('sizes map to the control tokens', () => {
    expect(buttonVariants({ size: 'sm' })).toContain('h-[var(--control-h-sm,1.5rem)]')
    expect(buttonVariants({ size: 'lg' })).toContain('h-[var(--control-h-lg,2rem)]')
    expect(buttonVariants({ size: 'xs' })).toContain('h-[var(--control-h-xs,1.25rem)]')
    expect(buttonVariants({ size: 'icon' })).toContain('size-[var(--control-h-md,1.75rem)]')
  })

  it('keeps the variant and size names', () => {
    for (const variant of ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const) {
      expect(buttonVariants({ variant })).toBeTruthy()
    }
    for (const size of ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const) {
      expect(buttonVariants({ size })).toBeTruthy()
    }
  })

  it('uses the Mira focus ring', () => {
    const c = buttonVariants()
    expect(c).toContain('focus-visible:ring-2')
    expect(c).toContain('focus-visible:ring-ring/30')
  })

  it('a per-page height still wins', () => {
    const w = mount(Button, { props: { class: 'h-10' } })
    expect(w.classes()).toContain('h-10')
    expect(w.classes()).not.toContain(md)
  })
})

describe('badge', () => {
  it('is a 20px badge with the md radius', () => {
    const c = badgeVariants()
    expect(c).toContain('h-[var(--control-h-xs,1.25rem)]')
    expect(c).toContain('rounded-md')
    expect(c).not.toContain('rounded-full')
    expect(c).not.toContain('rounded-sm')
    expect(mount(Badge).exists()).toBe(true)
  })
})

describe('form controls', () => {
  it('input is md height and transparent, focus only changes the border', () => {
    const c = mount(Input).classes()
    expect(c).toContain(md)
    expect(c).toContain('bg-transparent')
    expect(c).not.toContain('bg-input/20')
    expect(c).toContain('focus-visible:border-ring')
    expect(c).not.toContain('focus-visible:ring-2')
    expect(c).not.toContain('aria-invalid:ring-2')
  })

  it('textarea is transparent, focus only changes the border', () => {
    const c = mount(Textarea).classes()
    expect(c).toContain('bg-transparent')
    expect(c).not.toContain('bg-input/20')
    expect(c).toContain('focus-visible:border-ring')
    expect(c).not.toContain('focus-visible:ring-2')
    expect(c).not.toContain('aria-invalid:ring-2')
  })

  it('select trigger reads the md and sm control heights', () => {
    const c = mount(Select, { slots: { default: SelectTrigger } })
      .get('[data-slot=select-trigger]')
      .classes()
      .join(' ')
    expect(c).toContain('data-[size=default]:h-[var(--control-h-md,1.75rem)]')
    expect(c).toContain('data-[size=sm]:h-[var(--control-h-sm,1.5rem)]')
    expect(c).toContain('focus-visible:border-ring')
    expect(c).not.toContain('focus-visible:ring-2')
  })

  it('native select reads the md control height', () => {
    const w = mount(NativeSelect)
    expect(w.find('select').classes()).toContain(md)
    expect(w.find('select').classes()).not.toContain('focus-visible:ring-2')
  })

  it('label uses the control text token', () => {
    const c = mount(Label).classes()
    expect(c).toContain('text-[length:var(--text-control,0.75rem)]')
  })

  it('checkbox and switch keep their slots and use the reka state attributes', () => {
    const checkbox = mount(Checkbox)
    const box = checkbox.get('[data-slot=checkbox]')
    expect(box.classes().join(' ')).toContain('data-[state=checked]:bg-primary')
    expect(box.classes().join(' ')).toContain(
      'data-[state=indeterminate]:bg-primary',
    )
    const sw = mount(Switch)
    const toggle = sw.get('[data-slot=switch]')
    expect(toggle.classes().join(' ')).toContain('data-[state=checked]:bg-primary')
  })
})
