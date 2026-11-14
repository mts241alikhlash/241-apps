// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, expect, it } from 'vitest'
import { authConfig } from '../config'
import AuthLogo from './AuthLogo.vue'

const original = { ...authConfig.value }

afterEach(() => {
  authConfig.value = { ...original }
})

it('shows the school logo unless the app names its own', () => {
  expect(mount(AuthLogo).get('img').attributes('src')).toBe('/logo.webp')

  authConfig.value = {
    ...original,
    logoSrc: '/istiqra.webp',
    logoAlt: 'Logo Istiqra',
  }
  const logo = mount(AuthLogo).get('img')

  expect(logo.attributes('src')).toBe('/istiqra.webp')
  expect(logo.attributes('alt')).toBe('Logo Istiqra')
})

it('keeps the school wordmark for every app', () => {
  authConfig.value = { ...original, logoSrc: '/istiqra.webp' }

  expect(
    mount(AuthLogo, { props: { wordmark: true } })
      .get('img')
      .attributes('src'),
  ).toBe('/logo-name.webp')
})
