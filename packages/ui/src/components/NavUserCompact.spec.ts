// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import NavUser from './NavUser.vue'
import { SidebarProvider } from './ui/sidebar'

const user = { name: 'Ahmad Fauzi', email: 'a@b.id', avatar: '' }

describe('NavUser compact', () => {
  it('renders only an avatar trigger with the name for screen readers', () => {
    const w = mount(() =>
      h(SidebarProvider, null, () => h(NavUser, { user, compact: true })),
    )
    expect(w.find('[data-sidebar="menu-button"]').exists()).toBe(false)
    expect(w.find('button').classes()).toContain('rounded-full')
    expect(w.find('button .sr-only').text()).toBe('Ahmad Fauzi')
    expect(w.text()).toContain('AF')
    expect(w.text()).not.toContain('a@b.id')
  })
})
