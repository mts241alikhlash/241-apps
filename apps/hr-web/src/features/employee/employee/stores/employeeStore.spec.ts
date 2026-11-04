import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Employee } from '../types'
import { useEmployeeStore } from './employeeStore'

function employee(id: string, isActive: boolean): Employee {
  return {
    id,
    nip: null,
    nuptk: null,
    employmentTypeId: 'et-1',
    employmentType: { id: 'et-1', code: 'PNS', name: 'PNS' },
    userId: `user-${id}`,
    user: {
      id: `user-${id}`,
      identifier: id,
      isActive,
      profile: { name: id, nik: '1', gender: 'MALE' },
    },
    positions: [],
  }
}

describe('employeeStore status filter', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('filters on the account status the server sends in user.isActive', () => {
    const store = useEmployeeStore()
    store.employees = [employee('aktif', true), employee('nonaktif', false)]

    store.filters.statusFilter = 'active'
    expect(store.filteredEmployees.map((e) => e.id)).toEqual(['aktif'])

    store.filters.statusFilter = 'inactive'
    expect(store.filteredEmployees.map((e) => e.id)).toEqual(['nonaktif'])
  })
})
