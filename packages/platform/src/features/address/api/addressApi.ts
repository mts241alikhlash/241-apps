import type {
  ApiSingleResponse,
  ApiPaginatedResponse,
} from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type { AddressSavePayload, AddressRecord, RegionNode } from '../types'

export const addressApi = {
  getProvinces: () =>
    api.get<ApiSingleResponse<RegionNode[]>>('/regions/provinces'),
  getRegionChildren: (code: string) =>
    api.get<ApiSingleResponse<RegionNode[]>>(
      `/regions/${encodeURIComponent(code)}/children`,
    ),
  getAddressesByUserId: (userId: string) => {
    return api.get<ApiSingleResponse<AddressRecord>>(
      `/profiles/${userId}/addresses`,
    )
  },
  getMyAddresses: () => {
    return api.get<ApiPaginatedResponse<AddressRecord>>(
      '/profiles/me/addresses',
    )
  },
  createMyAddress: (payload: AddressSavePayload) => {
    return api.post<ApiSingleResponse<AddressRecord>>(
      '/profiles/me/addresses',
      payload,
    )
  },
  createAddressForUser: (userId: string, payload: AddressSavePayload) => {
    return api.post<ApiSingleResponse<AddressRecord>>(
      `/profiles/${userId}/addresses`,
      payload,
    )
  },
  updateMyAddress: (addressId: string, payload: AddressSavePayload) => {
    return api.patch<ApiSingleResponse<AddressRecord>>(
      `/profiles/me/addresses/${addressId}`,
      payload,
    )
  },
}
