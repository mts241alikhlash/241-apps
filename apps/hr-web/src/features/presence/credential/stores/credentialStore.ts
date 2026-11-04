import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Credential,
  CredentialStatus,
  CredentialWithCode,
  PresenceSubjectType,
} from '../types'

export const useCredentialStore = defineStore('presence-credential', () => {
  const items = ref<Credential[]>([])
  const totalItems = ref(0)
  const loading = ref(false)
  const isSaving = ref(false)

  const page = ref(1)
  const limit = ref(10)
  const search = ref('')
  const subjectType = ref<PresenceSubjectType | ''>('')
  const status = ref<CredentialStatus | ''>('')

  const lastIssued = ref<CredentialWithCode | null>(null)

  const printBatch = ref<CredentialWithCode[]>([])
  const selectedUserIds = ref<string[]>([])

  function clearIssued() {
    lastIssued.value = null
  }

  return {
    items,
    totalItems,
    loading,
    isSaving,
    page,
    limit,
    search,
    subjectType,
    status,
    lastIssued,
    printBatch,
    selectedUserIds,
    clearIssued,
  }
})
