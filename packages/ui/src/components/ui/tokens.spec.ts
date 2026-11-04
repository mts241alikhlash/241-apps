// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { cn } from '@mts241alikhlash/ui/utils'
import { sidebarMenuButtonVariants } from './sidebar'
import SidebarMenuSubButton from './sidebar/SidebarMenuSubButton.vue'
import SidebarGroupLabel from './sidebar/SidebarGroupLabel.vue'

describe('sidebar size tokens', () => {
  it('menu button default reads the md control height and text token', () => {
    const c = sidebarMenuButtonVariants()
    expect(c).toContain('h-[var(--control-h-md,1.75rem)]')
    expect(c).toContain('text-[length:var(--text-control,0.75rem)]')
    expect(c).toContain('[&>svg]:size-[var(--icon-control,0.875rem)]')
    expect(c).not.toMatch(/(^| )h-7( |$)/)
  })

  it('menu button sm reads the sm control height', () => {
    expect(sidebarMenuButtonVariants({ size: 'sm' })).toContain(
      'h-[var(--control-h-sm,1.5rem)]',
    )
  })

  it('collapsed menu button is as wide as the md control height', () => {
    expect(sidebarMenuButtonVariants()).toContain(
      'group-data-[collapsible=icon]:size-[var(--control-h-md,1.75rem)]!',
    )
  })

  it('sub button reads the sm control height', () => {
    const w = mount(SidebarMenuSubButton)
    expect(w.classes()).toContain('h-[var(--control-h-sm,1.5rem)]')
  })

  it('group label reads the md control height', () => {
    const w = mount(SidebarGroupLabel)
    expect(w.classes()).toContain('h-[var(--control-h-md,1.75rem)]')
  })

  it('keeps a per-page height override', () => {
    const merged = cn(sidebarMenuButtonVariants(), 'h-10').split(/\s+/)
    expect(merged).toContain('h-10')
    expect(merged).not.toContain('h-[var(--control-h-md,1.75rem)]')
  })
})
