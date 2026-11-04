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
  let api!: ReturnType<typeof useAddressForm>
  mount(
    defineComponent({
      setup() {
        api = useAddressForm({ props, emit, saveAddress })
        return () => null
      },
    }),
  )
  return { api, saveAddress, emit }
}

describe('useAddressForm region codes', () => {
  it('restores the saved code chain into the form', async () => {
    const { api } = setup(saved)
    await flushPromises()

    expect(api.regionCodes.value).toEqual(codes)
    expect(api.form.values.village).toBe('CIBIRU HILIR')
  })

  it('submits the selected names and codes for a changed chain', async () => {
    const { api, saveAddress } = setup(saved)
    await flushPromises()
    const nextCodes = {
      provinceCode: '31',
      regencyCode: '31.71',
      districtCode: '31.71.01',
      villageCode: '31.71.01.1001',
    }
    const nextNames = {
      province: 'DKI JAKARTA',
      city: 'JAKARTA PUSAT',
      district: 'GAMBIR',
      village: 'GAMBIR',
    }

    api.setRegionCodes(nextCodes)
    api.setRegionNames(nextNames)
    await api.onSubmit()
    await flushPromises()

    expect(saveAddress).toHaveBeenCalledWith(
      expect.objectContaining({ ...nextCodes, ...nextNames }),
      false,
      'addr-1',
    )
  })

  it('preserves the code chain when another field changes', async () => {
    const { api, saveAddress } = setup(saved)
    await flushPromises()

    api.form.setFieldValue('street', 'Jl. Baru 2')
    await api.onSubmit()
    await flushPromises()

    expect(saveAddress).toHaveBeenCalledWith(
      expect.objectContaining({ street: 'Jl. Baru 2', ...codes, ...names }),
      false,
      'addr-1',
    )
  })

  it('requires a complete region chain when saving a name-only address', async () => {
    const nameOnly = {
      ...saved,
      provinceCode: null,
      regencyCode: null,
      districtCode: null,
      villageCode: null,
    }
    const { api, saveAddress } = setup(nameOnly)
    await flushPromises()

    await api.onSubmit()
    await flushPromises()

    expect(saveAddress).not.toHaveBeenCalled()
    expect(api.regionErrors.value.provinceCode).toBe('Provinsi wajib dipilih')
    expect(api.regionErrors.value.villageCode).toBe(
      'Desa / Kelurahan wajib dipilih',
    )
  })

  it('creates a primary address after all region levels are selected', async () => {
    const { api, saveAddress } = setup(null)
    await flushPromises()

    api.form.setFieldValue('street', 'Jl. Merdeka')
    api.setRegionCodes(codes)
    api.setRegionNames(names)
    await api.onSubmit()
    await flushPromises()

    expect(saveAddress).toHaveBeenCalledWith(
      expect.objectContaining({ ...codes, ...names, isPrimary: true }),
      true,
      undefined,
    )
  })
})
