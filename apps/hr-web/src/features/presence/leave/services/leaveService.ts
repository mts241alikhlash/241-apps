import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { leaveApi } from '../api/leaveApi'
import type {
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  SubmitLeavePayload,
} from '../types'

export const types = ref<LeaveType[]>([])
export const requests = ref<LeaveRequest[]>([])
export const myRequests = ref<LeaveRequest[]>([])
export const balances = ref<LeaveBalance[]>([])
export const loading = ref(false)
export const isSaving = ref(false)

export const pendingRequests = computed(() =>
  requests.value.filter((request) => request.status === 'PENDING'),
)

export const leaveService = {
  fetchTypes: async () => {
    try {
      const res = await leaveApi.getTypes()
      types.value = res.data?.data ?? []
    } catch (error: unknown) {
      toast.error(getIndonesianErrorMessage(error, 'Gagal memuat jenis izin.'))
    }
  },

  fetchRequests: async (params?: { status?: string; year?: number }) => {
    loading.value = true
    try {
      const res = await leaveApi.getRequests(params)
      requests.value = res.data?.data ?? []
    } catch (error: unknown) {
      toast.error(getIndonesianErrorMessage(error, 'Gagal memuat pengajuan.'))
      requests.value = []
    } finally {
      loading.value = false
    }
  },

  fetchMine: async (year?: number) => {
    loading.value = true
    try {
      const [requestRes, balanceRes] = await Promise.all([
        leaveApi.getMyRequests(year ? { year } : undefined),
        leaveApi.getMyBalances(year),
      ])
      myRequests.value = requestRes.data?.data ?? []
      balances.value = balanceRes.data?.data ?? []
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal memuat pengajuan Anda.'),
      )
    } finally {
      loading.value = false
    }
  },

  submit: async (payload: SubmitLeavePayload) => {
    isSaving.value = true
    try {
      await leaveApi.submit(payload)
      toast.success('Pengajuan terkirim.')
      await leaveService.fetchMine()
      return true
    } catch (error: unknown) {
      toast.error(getIndonesianErrorMessage(error, 'Gagal mengirim pengajuan.'))
      return false
    } finally {
      isSaving.value = false
    }
  },

  approve: async (id: string) => {
    isSaving.value = true
    try {
      await leaveApi.approve(id)
      toast.success('Pengajuan disetujui.')
      await leaveService.fetchRequests()
      return true
    } catch (error: unknown) {
      toast.error(getIndonesianErrorMessage(error, 'Gagal menyetujui.'))
      return false
    } finally {
      isSaving.value = false
    }
  },

  reject: async (id: string, reason: string) => {
    isSaving.value = true
    try {
      await leaveApi.reject(id, reason)
      toast.success('Pengajuan ditolak.')
      await leaveService.fetchRequests()
      return true
    } catch (error: unknown) {
      toast.error(getIndonesianErrorMessage(error, 'Gagal menolak.'))
      return false
    } finally {
      isSaving.value = false
    }
  },

  withdraw: async (id: string) => {
    try {
      await leaveApi.withdraw(id)
      toast.success('Pengajuan ditarik.')
      await leaveService.fetchMine()
      return true
    } catch (error: unknown) {
      toast.error(getIndonesianErrorMessage(error, 'Gagal menarik pengajuan.'))
      return false
    }
  },
}
