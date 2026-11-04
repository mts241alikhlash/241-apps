// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { expect, it, vi } from 'vitest'
import LoginForm from './LoginForm.vue'
import { configureAuth } from '../config'

it('connects the password label and validation state to the textbox', async () => {
  const wrapper = mount(LoginForm, {
    global: {
      plugins: [
        createPinia(),
        createRouter({ history: createMemoryHistory(), routes: [] }),
      ],
    },
  })
  const input = wrapper.get('input[name="password"]')
  expect(input.attributes('id')).toBeTruthy()
  expect(wrapper.find(`label[for="${input.attributes('id')}"]`).exists()).toBe(
    true,
  )
  expect(input.attributes('aria-describedby')).toBeTruthy()
  await wrapper.get('form').trigger('submit')
  await vi.waitFor(() => expect(input.attributes('aria-invalid')).toBe('true'))
  wrapper.unmount()
})

it('labels the identifier with the configured text and keeps mobile keyboards from capitalising it', () => {
  configureAuth({ identifierLabel: 'Email atau ID Pengguna' })
  const wrapper = mount(LoginForm, {
    global: {
      plugins: [
        createPinia(),
        createRouter({ history: createMemoryHistory(), routes: [] }),
      ],
    },
  })
  const input = wrapper.get('input[name="identifier"]')
  expect(
    wrapper.get(`label[for="${input.attributes('id')}"]`).text(),
  ).toContain('Email atau ID Pengguna')
  expect(input.attributes('autocapitalize')).toBe('none')
  expect(input.attributes('autocomplete')).toBe('username')
  expect(input.attributes('spellcheck')).toBe('false')
  wrapper.unmount()
})
