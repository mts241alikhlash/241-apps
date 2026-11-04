import { computed, ref } from 'vue'
import type { AddressFormState } from '../types'

export function useAddressSubform() {
  const address = ref<AddressFormState>({
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
  })

  const hasAddress = computed(() => address.value.street.trim() !== '')

  function validateAddress(): boolean {
    if (!hasAddress.value) return true
    const required = [
      address.value.provinceCode,
      address.value.regencyCode,
      address.value.districtCode,
      address.value.villageCode,
      address.value.country,
    ]
    return required.every((v) => v.trim() !== '')
  }

  return { address, hasAddress, validateAddress }
}
