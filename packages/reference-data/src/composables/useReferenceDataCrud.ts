import { ref } from 'vue'
import type { ReferenceDataConfig, ReferenceDataEntity } from '../types/config'

export function useReferenceDataCrud<
  T extends ReferenceDataEntity,
  TCreate = Record<string, unknown>,
  TUpdate = TCreate,
>(config: ReferenceDataConfig<T, TCreate, TUpdate>) {
  const data = ref<T[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)

  async function fetchAll() {
    isLoading.value = true
    try {
      data.value = await config.service.list()
    } finally {
      isLoading.value = false
    }
  }

  async function create(payload: TCreate) {
    isSubmitting.value = true
    try {
      const success = await config.service.create(payload)
      if (success) await fetchAll()
      return success
    } finally {
      isSubmitting.value = false
    }
  }

  async function update(id: string, payload: TUpdate) {
    isSubmitting.value = true
    try {
      const success = await config.service.update(id, payload)
      if (success) await fetchAll()
      return success
    } finally {
      isSubmitting.value = false
    }
  }

  async function remove(
    item: T,
    callbacks: { closeAlert: () => void; setLoading: (state: boolean) => void },
  ) {
    const success = await config.service.remove(item.id, callbacks)
    if (success) await fetchAll()
  }

  return { data, isLoading, isSubmitting, fetchAll, create, update, remove }
}
