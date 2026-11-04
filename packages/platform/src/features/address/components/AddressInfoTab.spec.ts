// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AddressInfoTab from './AddressInfoTab.vue'

const codes = {
  provinceCode: '32',
  regencyCode: '32.04',
  districtCode: '32.04.01',
  villageCode: '32.04.01.2001',
}
const names = {
  province: 'JAWA BARAT',
  city: 'KABUPATEN BANDUNG',
  district: 'CILEUNYI',
  village: 'CIBIRU HILIR',
}
const saved = {
  id: 'addr-1',
  street: 'Jl. Merdeka',
  rt: '001',
  rw: '002',
  postalCode: '40393',
  country: 'Indonesia',
  ...names,
  ...codes,
}

const RegionStub = {
  props: ['modelValue'],
  emits: ['update:modelValue', 'update:names'],
  template:
    '<button type="button" class="pick" :data-codes="JSON.stringify(modelValue)" @click="choose">pick</button>',
  methods: {
    choose(this: { $emit: (event: string, value: unknown) => void }) {
      this.$emit('update:modelValue', {
        provinceCode: '31',
        regencyCode: '31.71',
        districtCode: '31.71.01',
        villageCode: '31.71.01.1001',
      })
      this.$emit('update:names', {
        province: 'DKI JAKARTA',
        city: 'JAKARTA PUSAT',
        district: 'GAMBIR',
        village: 'GAMBIR',
      })
    },
  },
}

function mountTab(isEditable: boolean, rawAddress: object | null = saved) {
  return mount(AddressInfoTab, {
    props: {
      data: { address: rawAddress as typeof saved | null },
      rawAddress,
      isEditable,
    },
    global: { stubs: { RegionSelect: RegionStub } },
  })
}

describe('AddressInfoTab regions', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('keeps saved region names visible without an editable picker', async () => {
    const wrapper = mountTab(false)
    await flushPromises()

    expect(wrapper.find('.pick').exists()).toBe(false)
    expect(
      wrapper.findAll('input').map((input) => input.element.value),
    ).toEqual(expect.arrayContaining(Object.values(names)))
  })

  it('keeps code fields off the emitted name-only address display', async () => {
    const wrapper = mountTab(false)
    await flushPromises()
    const values = wrapper.findAll('input').map((input) => input.element.value)
    expect(values).toContain('CIBIRU HILIR')
    expect(values).not.toContain('32.04.01')
  })

  it('hands saved codes to the picker when editing', async () => {
    const wrapper = mountTab(true)
    await flushPromises()

    expect(JSON.parse(wrapper.get('.pick').attributes('data-codes')!)).toEqual(
      codes,
    )
  })

  it('saves selected codes and official names', async () => {
    const wrapper = mountTab(true)
    await flushPromises()

    await wrapper.get('.pick').trigger('click')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
      street: 'Jl. Merdeka',
      provinceCode: '31',
      regencyCode: '31.71',
      districtCode: '31.71.01',
      villageCode: '31.71.01.1001',
      province: 'DKI JAKARTA',
      city: 'JAKARTA PUSAT',
      district: 'GAMBIR',
      village: 'GAMBIR',
    })
  })

  it('does not save unless all four levels are selected', async () => {
    const wrapper = mountTab(true, { ...saved, villageCode: null })
    await flushPromises()

    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Pilih provinsi, kabupaten/kota, kecamatan, dan desa/kelurahan',
    )
  })
})
