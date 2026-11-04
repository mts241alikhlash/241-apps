// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { AddressFormState } from '@/features/shared/multi-step-form'
import EmployeeReviewStep from './EmployeeReviewStep.vue'

const address: AddressFormState = {
  street: 'Jl. Merdeka',
  rt: '',
  rw: '',
  village: 'CIBIRU HILIR',
  district: 'CILEUNYI',
  city: 'KABUPATEN BANDUNG',
  province: 'JAWA BARAT',
  postalCode: '',
  country: 'Indonesia',
  provinceCode: '32',
  regencyCode: '32.04',
  districtCode: '32.04.01',
  villageCode: '32.04.01.2001',
}

function mountStep(hasAddress: boolean) {
  return mount(EmployeeReviewStep, {
    props: {
      values: { name: 'Budi' },
      address,
      hasAddress,
      extraPositions: [],
    },
  })
}

describe('EmployeeReviewStep', () => {
  it('lists the street and official region names, never the codes', () => {
    const text = mountStep(true).text()

    expect(text).toContain(
      'Jl. Merdeka, CIBIRU HILIR, CILEUNYI, KABUPATEN BANDUNG, JAWA BARAT',
    )
    expect(text).not.toContain('32.04')
  })

  it('says the address was skipped when none was entered', () => {
    expect(mountStep(false).text()).toContain('Dilewati')
  })
})
