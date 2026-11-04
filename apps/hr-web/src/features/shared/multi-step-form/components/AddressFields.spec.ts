// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import type { AddressFormState } from '../types'
import AddressFields from './AddressFields.vue'

vi.mock('@/features/platform/address', () => ({
  RegionSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue', 'update:names'],
    template:
      '<button type="button" class="pick" :data-codes="JSON.stringify(modelValue)" @click="choose">pick</button>',
    methods: {
      choose(this: { $emit: (...args: unknown[]) => void }) {
        this.$emit('update:modelValue', {
          provinceCode: '32',
          regencyCode: '32.04',
          districtCode: '32.04.01',
          villageCode: '32.04.01.2001',
        })
        this.$emit('update:names', {
          province: 'JAWA BARAT',
          city: 'KABUPATEN BANDUNG',
          district: 'CILEUNYI',
          village: 'CIBIRU HILIR',
        })
      },
    },
  },
}))

function emptyAddress(): AddressFormState {
  return {
    street: '',
    rt: '',
    rw: '',
    village: '',
    district: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Indonesia',
    provinceCode: '',
    regencyCode: '',
    districtCode: '',
    villageCode: '',
  }
}

describe('AddressFields', () => {
  it('replaces free-text region inputs with the region picker', () => {
    const wrapper = mount(AddressFields, {
      props: { modelValue: reactive(emptyAddress()) },
    })

    expect(wrapper.find('.pick').exists()).toBe(true)
    for (const placeholder of [
      'Desa / kelurahan',
      'Kecamatan',
      'Kota / kabupaten',
      'Provinsi',
    ]) {
      expect(wrapper.find(`input[placeholder="${placeholder}"]`).exists()).toBe(
        false,
      )
    }
    expect(
      wrapper.find('input[placeholder="Nama jalan, nomor rumah"]').exists(),
    ).toBe(true)
    expect(wrapper.find('input[placeholder="Kode pos"]').exists()).toBe(true)
  })

  it('hands current codes to the picker', () => {
    const address = reactive({ ...emptyAddress(), provinceCode: '32' })
    const wrapper = mount(AddressFields, { props: { modelValue: address } })

    expect(JSON.parse(wrapper.get('.pick').attributes('data-codes')!)).toEqual({
      provinceCode: '32',
      regencyCode: '',
      districtCode: '',
      villageCode: '',
    })
  })

  it('stores chosen codes and official names in the address', async () => {
    const address = reactive(emptyAddress())
    const wrapper = mount(AddressFields, { props: { modelValue: address } })

    await wrapper.get('.pick').trigger('click')

    expect(address).toMatchObject({
      provinceCode: '32',
      regencyCode: '32.04',
      districtCode: '32.04.01',
      villageCode: '32.04.01.2001',
      province: 'JAWA BARAT',
      city: 'KABUPATEN BANDUNG',
      district: 'CILEUNYI',
      village: 'CIBIRU HILIR',
    })
  })
})
