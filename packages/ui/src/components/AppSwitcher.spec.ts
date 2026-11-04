// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppSwitcher from './AppSwitcher.vue'

const apps = [
  { key: 'admission', name: '241 Admission', logo: '/a.webp' },
  { key: 'academic', name: '241 Academic', logo: '/b.webp' },
]

describe('AppSwitcher', () => {
  it('shows the current app on the trigger', () => {
    const w = mount(AppSwitcher, { props: { apps, currentKey: 'academic' } })
    expect(w.find('button').text()).toBe('241 Academic')
    expect(w.find('button img').attributes('src')).toBe('/b.webp')
  })

  it('falls back to the first app for an unknown key', () => {
    const w = mount(AppSwitcher, { props: { apps, currentKey: 'missing' } })
    expect(w.find('button').text()).toBe('241 Admission')
  })

  it('renders nothing without apps', () => {
    const w = mount(AppSwitcher, { props: { apps: [], currentKey: 'x' } })
    expect(w.find('button').exists()).toBe(false)
  })
})
