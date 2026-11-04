// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { expect, it } from 'vitest'
import { vDigits } from './vDigits'

function host(phone = false) {
  return mount(
    defineComponent({
      directives: { digits: vDigits },
      setup: () => ({ value: ref('') }),
      template: phone
        ? '<input v-model="value" v-digits.phone />'
        : '<input v-model="value" v-digits />',
    }),
  )
}

function beforeInput(input: HTMLInputElement, inputType: string, data: string) {
  const event = new InputEvent('beforeinput', {
    inputType,
    data,
    cancelable: true,
  })
  input.dispatchEvent(event)
  return event.defaultPrevented
}

it('refuses a typed letter and keeps a typed digit', () => {
  const input = host().get('input').element
  expect(beforeInput(input, 'insertText', 'a')).toBe(true)
  expect(beforeInput(input, 'insertText', '7')).toBe(false)
})

it('keeps only the digits of pasted text and of anything that slips through', async () => {
  const wrapper = host()
  const input = wrapper.get('input')
  await input.setValue('32 05-01ab')
  expect(input.element.value).toBe('320501')
  expect((wrapper.vm as unknown as { value: string }).value).toBe('320501')
})

it('lets a phone number keep plus, spaces and dashes', async () => {
  const wrapper = host(true)
  const input = wrapper.get('input')
  expect(beforeInput(input.element, 'insertText', '+')).toBe(false)
  await input.setValue('+62 812-34ab')
  expect(input.element.value).toBe('+62 812-34')
})
