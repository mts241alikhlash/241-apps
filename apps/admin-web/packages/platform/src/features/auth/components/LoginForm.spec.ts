// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { expect, it, vi } from 'vitest'
import LoginForm from './LoginForm.vue'

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
