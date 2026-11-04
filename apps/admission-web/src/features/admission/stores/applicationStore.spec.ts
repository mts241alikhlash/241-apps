import { beforeEach, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useApplicationStore } from './applicationStore'

beforeEach(() => setActivePinia(createPinia()))

it('clears applicant list context when the session changes', () => {
  const store = useApplicationStore()
  store.listContext = {
    ownerId: 'admin-1',
    search: 'nama',
    status: 'DRAFT',
    waveId: 'wave-1',
    page: 3,
    scrollTop: 420,
    returning: true,
  }
  store.resetListContext()
  expect(store.listContext).toEqual({
    ownerId: null,
    search: '',
    status: 'ALL',
    waveId: 'ALL',
    page: 1,
    scrollTop: 0,
    returning: false,
  })
})
