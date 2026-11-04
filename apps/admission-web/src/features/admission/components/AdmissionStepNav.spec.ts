// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AdmissionStepNav from './AdmissionStepNav.vue'

it('marks current step and emits selection, but locks while saving', async () => {
  const wrapper = mount(AdmissionStepNav, {
    props: { steps: ['Data Diri', 'Alamat'], currentStep: 0, disabled: false },
  })
  const buttons = wrapper.findAll('ol button')
  expect(buttons).toHaveLength(2)
  expect(buttons[0].attributes('aria-current')).toBe('step')
  expect(buttons[1].attributes('aria-current')).toBeUndefined()
  expect(
    buttons.every((button) =>
      button.classes().includes('size-[var(--control-h-md,1.75rem)]'),
    ),
  ).toBe(true)
  expect(
    buttons.every((button) => button.attributes('type') === 'button'),
  ).toBe(true)
  await buttons[1].trigger('click')
  expect(wrapper.emitted('select')?.[0]).toEqual([1])
  await wrapper.setProps({ disabled: true })
  expect(
    wrapper
      .findAll('ol button')
      .every((button) => button.attributes('disabled') !== undefined),
  ).toBe(true)
  await wrapper.findAll('ol button')[1].trigger('click')
  expect(wrapper.emitted('select')).toHaveLength(1)
})

it('shows numbered connected steps with a three-step mobile window', async () => {
  const steps = [
    'Diri',
    'Wali',
    'Alamat',
    'Sekolah',
    'Prestasi',
    'Berkas',
    'Bayar',
    'Review',
  ]
  const wrapper = mount(AdmissionStepNav, {
    props: { steps, currentStep: 3, disabled: false },
  })

  const items = wrapper.findAll('ol li')
  expect(items).toHaveLength(8)
  expect(
    items.filter((item) => !item.classes().includes('hidden')),
  ).toHaveLength(3)
  expect(items[1].classes()).toContain('hidden')
  expect(items[2].classes()).not.toContain('hidden')
  expect(items[4].classes()).not.toContain('hidden')
  expect(items[5].classes()).toContain('hidden')
  expect(wrapper.findAll('[data-test="step-connector"]')).toHaveLength(7)
  expect(wrapper.find('h2').exists()).toBe(false)
  expect(wrapper.findAll('ol button')[3].text()).toContain('4')

  await wrapper.setProps({ currentStep: 7 })
  expect(wrapper.findAll('ol li')[5].classes()).not.toContain('hidden')
  expect(wrapper.findAll('ol li')[4].classes()).toContain('hidden')
})

it('marks a flagged step in red and tells screen readers it needs a fix', () => {
  const wrapper = mount(AdmissionStepNav, {
    props: {
      steps: ['Data Diri', 'Berkas', 'Pembayaran'],
      currentStep: 0,
      disabled: false,
      flagged: [1],
    },
  })
  const [first, flagged, third] = wrapper.findAll('ol button')
  expect(flagged.classes()).toContain('border-destructive')
  expect(flagged.classes()).toContain('text-destructive')
  expect(flagged.text()).toContain('perlu diperbaiki')
  expect(flagged.find('svg').exists()).toBe(true)
  expect(first.classes()).not.toContain('border-destructive')
  expect(third.text()).not.toContain('perlu diperbaiki')
})

it('fills the flagged step when it is the current one', () => {
  const wrapper = mount(AdmissionStepNav, {
    props: {
      steps: ['Data Diri', 'Berkas'],
      currentStep: 1,
      disabled: false,
      flagged: [1],
    },
  })
  expect(wrapper.findAll('ol button')[1].classes()).toContain('bg-destructive')
})
