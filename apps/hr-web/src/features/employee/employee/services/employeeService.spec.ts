import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { addressApi } from '@/features/platform/address'
import { useReferenceList } from '@/features/platform/reference-data'
import { employeeApi } from '../api/employeeApi'
import { useEmployeeStore } from '../stores/employeeStore'
import type { CreateEmployeeWithRelationsInput } from '../types'
import { employeeService } from './employeeService'

const input: CreateEmployeeWithRelationsInput = {
  core: {
    name: 'Budi',
    nik: '1234567890123456',
    gender: 'MALE',
    birthPlace: 'Bandung',
    birthDate: '1990-01-01',
    employmentTypeId: 'et-1',
  },
  address: {
    street: 'Jl. Sekolah',
    village: 'Sukamaju',
    district: 'Cicendo',
    city: 'Bandung',
    province: 'Jawa Barat',
    country: 'Indonesia',
  },
  positions: [
    { positionId: 'pos-1', hireDate: '2025-01-01', isPrimary: false },
    { positionId: 'pos-2', hireDate: '2025-02-01', isPrimary: false },
  ],
}

describe('employeeService.createEmployeeWithRelations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(employeeApi, 'createEmployee').mockResolvedValue({
      data: { data: { id: 'emp-1', user: { id: 'u-1' } } },
    } as Awaited<ReturnType<typeof employeeApi.createEmployee>>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useReferenceList().clear()
  })

  it('keeps employee saved and processes positions when address fails', async () => {
    vi.spyOn(addressApi, 'createAddressForUser').mockRejectedValue(
      new Error('Alamat gagal disimpan.'),
    )
    const createPosition = vi
      .spyOn(employeeApi, 'createPosition')
      .mockResolvedValue(
        {} as Awaited<ReturnType<typeof employeeApi.createPosition>>,
      )

    const result = await employeeService.createEmployeeWithRelations(input)

    expect(result).toEqual({
      success: true,
      employeeId: 'emp-1',
      userId: 'u-1',
      warnings: ['Alamat gagal disimpan.'],
    })
    expect(createPosition).toHaveBeenCalledTimes(2)
    expect(useEmployeeStore().isSaving).toBe(false)
  })

  it('keeps employee saved and processes later positions when one position fails', async () => {
    vi.spyOn(addressApi, 'createAddressForUser').mockResolvedValue(
      {} as Awaited<ReturnType<typeof addressApi.createAddressForUser>>,
    )
    const createPosition = vi.spyOn(employeeApi, 'createPosition')
    createPosition.mockRejectedValueOnce(new Error('Jabatan gagal disimpan.'))
    createPosition.mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof employeeApi.createPosition>>,
    )

    const result = await employeeService.createEmployeeWithRelations(input)

    expect(result).toEqual({
      success: true,
      employeeId: 'emp-1',
      userId: 'u-1',
      warnings: ['Sebagian jabatan gagal disimpan.'],
    })
    expect(createPosition).toHaveBeenNthCalledWith(2, 'emp-1', {
      positionId: 'pos-2',
      hireDate: '2025-02-01',
      isPrimary: false,
    })
    expect(useEmployeeStore().isSaving).toBe(false)
  })
})
