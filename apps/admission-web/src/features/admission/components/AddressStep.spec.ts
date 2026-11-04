// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import AddressStep from './AddressStep.vue'
import { useApplicationFormState } from '../composables/useApplicationFormState'

const RegionStub = defineComponent({
  props: {
    modelValue: { type: Object, default: undefined },
    invalid: Boolean,
    disabled: Boolean,
  },
  emits: ['update:modelValue'],
  setup:
    (props, { emit }) =>
    () =>
      h(
        'button',
        {
          'data-test': 'region',
          'data-invalid': String(!!props.invalid),
          onClick: () =>
            emit('update:modelValue', {
              provinceCode: '32',
              regencyCode: '',
              districtCode: '',
              villageCode: '',
            }),
        },
        'region',
      ),
})

const ParentsStub = defineComponent({
  props: {
    modelValue: { type: Array, default: undefined },
    editable: Boolean,
  },
  setup: () => () => h('div', { 'data-test': 'parents' }),
  methods: { validate: () => Promise.resolve({ valid: true }) },
})

function mountStep() {
  const { address, parents } = useApplicationFormState()
  return mount(AddressStep, {
    props: {
      modelValue: address.value,
      parents: parents.value,
      editable: true,
    },
    global: {
      stubs: { RegionSelect: RegionStub, ParentAddresses: ParentsStub },
    },
  })
}

describe('AddressStep region validation', () => {
  it('has no explanatory line under the card title', () => {
    const wrapper = mountStep()

    expect(wrapper.text()).not.toContain('Santri mengikuti alamat ini')
    expect(wrapper.text()).not.toContain('Wilayah wajib dipilih')
  })

  it('does not mark the region invalid before the step was validated', async () => {
    const wrapper = mountStep()
    await flushPromises()

    expect(wrapper.get('[data-test="region"]').attributes('data-invalid')).toBe(
      'false',
    )
    await wrapper.get('[data-test="region"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-test="region"]').attributes('data-invalid')).toBe(
      'false',
    )
  })

  it('marks the region invalid only after the step was validated with no village', async () => {
    const wrapper = mountStep()
    await flushPromises()

    const exposed = wrapper.vm as unknown as {
      validate: () => Promise<{ valid: boolean }>
    }
    const result = await exposed.validate()
    await flushPromises()

    expect(result.valid).toBe(false)
    expect(wrapper.get('[data-test="region"]').attributes('data-invalid')).toBe(
      'true',
    )
  })
})
