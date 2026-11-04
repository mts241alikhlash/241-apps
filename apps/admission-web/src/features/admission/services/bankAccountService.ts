import { toast } from 'vue-sonner'
import { admissionApi } from '../api/admissionApi'
import type { AdmissionBankAccount, BankAccountSavePayload } from '../types'
import { useReferenceList } from '@/features/platform/reference-data'
import { admissionErrorMessage } from '../utils'

export const bankAccountService = {
  fetchAll: async (): Promise<
    { accounts: AdmissionBankAccount[] } | { error: string }
  > => {
    try {
      return {
        accounts: (await admissionApi.getBankAccounts()).data.data ?? [],
      }
    } catch (error: unknown) {
      return { error: admissionErrorMessage(error, 'Gagal memuat rekening.') }
    }
  },

  save: async (id: string | null, payload: BankAccountSavePayload) => {
    try {
      if (id) await admissionApi.updateBankAccount(id, payload)
      else await admissionApi.createBankAccount(payload)
      toast.success(id ? 'Rekening diperbarui.' : 'Rekening ditambahkan.')
      useReferenceList().invalidate('admissionFormOptions')
      return { success: true }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal menyimpan rekening.'))
      return { success: false }
    }
  },

  remove: async (id: string) => {
    try {
      await admissionApi.deleteBankAccount(id)
      toast.success('Rekening dihapus.')
      useReferenceList().invalidate('admissionFormOptions')
      return { success: true }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal menghapus rekening.'))
      return { success: false }
    }
  },
}
