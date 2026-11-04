// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  SidebarInset,
  SidebarMenuSub,
  SidebarMenuSubButton,
  sidebarMenuButtonVariants,
} from './index'

describe('sidebar items', () => {
  it('menu button is muted until active', () => {
    const c = sidebarMenuButtonVariants()
    expect(c).toContain('text-muted-foreground')
    expect(c).toContain('data-[active=true]:text-sidebar-accent-foreground')
    expect(c).toContain('data-[active=true]:bg-sidebar-accent')
    expect(c).toContain('data-[active=true]:font-medium')
    expect(c).toContain('hover:text-sidebar-accent-foreground')
    expect(c).not.toMatch(/(^| )text-sidebar-foreground/)
  })

  it('menu buttons use the Mira sizes and a visible focus outline', () => {
    expect(sidebarMenuButtonVariants()).toContain(
      'h-[var(--control-h-md,1.75rem)]',
    )
    expect(sidebarMenuButtonVariants({ size: 'sm' })).toContain(
      'h-[var(--control-h-sm,1.5rem)]',
    )
    expect(sidebarMenuButtonVariants({ size: 'lg' })).toContain('h-12')
    const c = sidebarMenuButtonVariants()
    expect(c).toContain('focus-visible:outline-1')
    expect(c).toContain('focus-visible:outline-solid')
    expect(c).toContain('focus-visible:outline-ring')
  })

  it('large menu button keeps the full-strength text', () => {
    const c = sidebarMenuButtonVariants({ size: 'lg' })
    expect(c).not.toContain('text-muted-foreground')
    expect(c).toContain('text-sidebar-foreground')
    expect(sidebarMenuButtonVariants({ size: 'sm' })).toContain('text-muted-foreground')
  })

  it('sub button is muted until active', () => {
    const w = mount(SidebarMenuSubButton)
    expect(w.classes()).toEqual(
      expect.arrayContaining([
        'text-muted-foreground',
        'h-[var(--control-h-sm,1.5rem)]',
        'rounded-md',
      ]),
    )
    expect(w.classes().join(' ')).toContain('data-[active=true]:font-medium')
    const active = mount(SidebarMenuSubButton, { props: { isActive: true } })
    expect(active.attributes('data-active')).toBe('true')
  })
})

describe('sidebar inset', () => {
  it('inset is a bordered md card at every width', () => {
    const c = mount(SidebarInset).classes().join(' ')
    expect(c).toContain('peer-data-[variant=inset]:m-2')
    expect(c).toContain('peer-data-[variant=inset]:rounded-md')
    expect(c).toContain('peer-data-[variant=inset]:border-sidebar-border')
    expect(c).toContain('peer-data-[variant=inset]:bg-card')
    expect(c).toContain('peer-data-[variant=inset]:shadow-xs')
    expect(c).toContain('md:peer-data-[variant=inset]:ml-0')
    expect(c).not.toContain('rounded-xl')
  })

  it('sub menu keeps the 4px gap and left rule', () => {
    expect(mount(SidebarMenuSub).classes()).toEqual(
      expect.arrayContaining(['gap-1', 'border-l', 'border-sidebar-border', 'py-0.5']),
    )
  })
})
