// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { expect, it } from 'vitest'
import ForgotPasswordView from './ForgotPasswordView.vue'
import { configureAuth } from '../config'

it('labels the identifier with the configured text and keeps mobile keyboards from capitalising it', () => {
  configureAuth({ identifierLabel: 'Email atau ID Pengguna' })
  const wrapper = mount(ForgotPasswordView, {
    global: {
      plugins: [createRouter({ history: createMemoryHistory(), routes: [] })],
    },
  })
  const input = wrapper.get('input[name="identifier"]')
  expect(
    wrapper.get(`label[for="${input.attributes('id')}"]`).text(),
  ).toContain('Email atau ID Pengguna')
  expect(wrapper.text()).toContain(
    'Masukkan Email atau ID Pengguna Anda untuk menerima tautan reset password',
  )
  expect(input.attributes('autocapitalize')).toBe('none')
  expect(input.attributes('autocomplete')).toBe('username')
  expect(input.attributes('spellcheck')).toBe('false')
  wrapper.unmount()
})
