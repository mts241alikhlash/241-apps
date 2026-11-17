// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Alert, AlertDescription } from './alert'
import { Progress } from './progress'
import { Separator } from './separator'
import { Skeleton } from './skeleton'
import { Table } from './table'
import { Tabs, TabsList, TabsTrigger } from './tabs'
import { h } from 'vue'

const text = 'text-control'

function tabs() {
  return mount(Tabs, {
    props: { defaultValue: 'a' },
    slots: {
      default: () => [
        h(TabsList, null, () => h(TabsTrigger, { value: 'a' }, () => 'A')),
      ],
    },
  })
}

describe('tabs', () => {
  it('the list is an underline strip, never a pill', () => {
    const c = tabs().get('[data-slot=tabs-list]').classes()
    expect(c).toContain('border-b')
    expect(c).toContain('bg-transparent')
    expect(c).not.toContain('bg-muted')
  })

  it('trigger follows the control height token, the underline and the control text token', () => {
    const c = tabs().get('[data-slot=tabs-trigger]').classes()
    expect(c).toContain('min-h-[var(--control-h-lg,2.25rem)]')
    expect(c).not.toContain('min-h-11')
    expect(c).toContain('data-[state=active]:border-primary')
    expect(c).toContain(text)
  })
})

describe('surfaces', () => {
  it('table text follows the control token', () => {
    expect(mount(Table).get('table').classes()).toContain(text)
  })

  it('alert is compact', () => {
    const c = mount(Alert).classes()
    expect(c).toContain('px-2')
    expect(c).toContain('py-1.5')
    expect(c).toContain(text)
    expect(mount(AlertDescription).classes()).toContain(text)
  })

  it('progress track is the thin muted bar', () => {
    const c = mount(Progress, { props: { modelValue: 40 } }).classes()
    expect(c).toContain('bg-muted')
    expect(c).toContain('h-1')
  })

  it('skeleton is muted', () => {
    expect(mount(Skeleton).classes()).toContain('bg-muted')
  })

  it('vertical separator stretches', () => {
    const c = mount(Separator, { props: { orientation: 'vertical' } }).classes()
    expect(c).toContain('data-[orientation=vertical]:self-stretch')
  })
})
