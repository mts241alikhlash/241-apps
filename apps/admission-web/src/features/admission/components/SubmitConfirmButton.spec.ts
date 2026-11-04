// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import SubmitConfirmButton from './SubmitConfirmButton.vue'

it('submits only after the applicant confirms', async () => {
  const wrapper = mount(SubmitConfirmButton, {
    props: { disabled: false, submitting: false },
    attachTo: document.body,
  })

  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(document.body.textContent).toContain('Kirim formulir?')
  expect(wrapper.emitted('confirm')).toBeUndefined()

  document
    .querySelector<HTMLButtonElement>('[data-test="confirm-submit"]')!
    .click()
  await flushPromises()
  expect(wrapper.emitted('confirm')).toHaveLength(1)
  wrapper.unmount()
})

it('cannot be pressed while the application is incomplete', () => {
  const wrapper = mount(SubmitConfirmButton, {
    props: { disabled: true, submitting: false },
  })
  expect(wrapper.get('button').attributes('disabled')).toBeDefined()
})
