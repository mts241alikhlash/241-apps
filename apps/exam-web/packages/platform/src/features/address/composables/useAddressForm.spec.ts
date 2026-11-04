// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, reactive } from 'vue'
import type { AddressRecord } from '../types'
import { useAddressForm } from './useAddressForm'

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
const saved: AddressRecord = {
  id: 'addr-1',
  street: 'Jl. Merdeka',
  rt: '001',
  rw: '002',
  postalCode: '40393',
  country: 'Indonesia',
  ...names,
  ...codes,
}

function setup(address: AddressRecord | null) {
  const saveAddress = vi.fn().mockResolvedValue({ success: true })
  const emit = vi.fn()
  const props = reactive({
    open: true,
    profileData: address ? { address } : null,
  })
  let state!: ReturnType<typeof useAddressForm>
  mount(
    defineComponent({
      setup() {
        state = useAddressForm({ props, emit, saveAddress })
        return () => null
      },
    }),
  )
  return { state, saveAddress }
}

describe('useAddressForm region selection', () => {
  it('restores region names and codes when editing', async () => {
    const { state } = setup(saved)
    await flushPromises()
    expect(state.regionCodes.value).toEqual(codes)
    expect(state.form.values).toMatchObject(names)
  })

  it('includes canonical names and codes in updated address payload', async () => {
    const { state, saveAddress } = setup(saved)
    await flushPromises()
    state.setRegionCodes({
      provinceCode: '31',
      regencyCode: '31.71',
      districtCode: '31.71.01',
      villageCode: '31.71.01.1001',
    })
    state.setRegionNames({
      province: 'DKI JAKARTA',
      city: 'JAKARTA PUSAT',
      district: 'GAMBIR',
      village: 'GAMBIR',
    })

    await state.onSubmit()
    await flushPromises()

    expect(saveAddress).toHaveBeenCalledWith(
      expect.objectContaining({
        provinceCode: '31',
        regencyCode: '31.71',
        districtCode: '31.71.01',
        villageCode: '31.71.01.1001',
        province: 'DKI JAKARTA',
        city: 'JAKARTA PUSAT',
        district: 'GAMBIR',
        village: 'GAMBIR',
      }),
      false,
      'addr-1',
    )
  })

  it('requires all region codes before saving a name-only address', async () => {
    const { state, saveAddress } = setup({
      ...saved,
      provinceCode: null,
      regencyCode: null,
      districtCode: null,
      villageCode: null,
    })
    await flushPromises()

    await state.onSubmit()
    await flushPromises()

    expect(saveAddress).not.toHaveBeenCalled()
    expect(state.regionErrors.value.provinceCode).toBe('Provinsi wajib dipilih')
  })
})
