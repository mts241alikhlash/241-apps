// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import NavUser from './NavUser.vue'
import { SidebarProvider } from './ui/sidebar'

const render = () =>
  mount(() =>
    h(SidebarProvider, null, () =>
      h(NavUser, { user: { name: 'Ahmad Fauzi', email: 'a@b.id', avatar: '' } }),
    ),
  )

describe('NavUser', () => {
  it('shows initials, a muted email and a muted chevron', () => {
    const w = render()
    expect(w.text()).toContain('AF')
    const email = w.findAll('span').find((s) => s.text() === 'a@b.id')
    expect(email?.classes()).toContain('text-muted-foreground')
    expect(email?.classes().join(' ')).toContain(
      'in-[[data-sidebar=menu-button]:hover]:text-sidebar-accent-foreground',
    )
    expect(email?.classes().join(' ')).toContain(
      'in-[[data-sidebar=menu-button][data-state=open]]:text-sidebar-accent-foreground',
    )
    const button = w.find('[data-sidebar="menu-button"]')
    const chevron = button.findAll('svg').at(-1)
    expect(chevron?.classes()).toContain('text-muted-foreground')
    expect(w.find('[data-slot="avatar-fallback"]').classes()).toContain('bg-muted')
  })
})
