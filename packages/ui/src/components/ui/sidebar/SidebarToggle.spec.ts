// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { SidebarProvider, SidebarToggle } from './index'

const render = (defaultOpen: boolean) =>
  mount(() =>
    h(SidebarProvider, { defaultOpen }, () => h(SidebarToggle)),
  )

describe('SidebarToggle', () => {
  it('offers to collapse an open sidebar and expand a collapsed one', async () => {
    const open = render(true)
    expect(open.text()).toBe('Collapse sidebar')
    const closed = render(false)
    expect(closed.text()).toBe('Expand sidebar')
  })

  it('flips the label when clicked', async () => {
    const w = render(true)
    await w.find('button').trigger('click')
    expect(w.text()).toBe('Expand sidebar')
  })
})
