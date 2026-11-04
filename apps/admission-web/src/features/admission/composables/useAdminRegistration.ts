import { ref } from 'vue'
import { isAxiosError } from 'axios'
import { toast } from 'vue-sonner'
import { admissionApi } from '../api/admissionApi'
import type {
  AdmissionApplication,
  RegisterPayload,
  UpdateApplicationPayload,
} from '../types'
import { admissionErrorMessage } from '../utils'

interface PaymentProofPayload {
  bankName: string
  bankAccountId: string
  senderAccountName: string
  transferDate?: string
}

export interface ApplicantCredentials {
  registrationNumber: string
  email: string
  password: string
}

export function useAdminRegistration() {
  const applicationId = ref<string | null>(null)
  const credentials = ref<ApplicantCredentials | null>(null)
  const fetchError = ref<'not-found' | 'load-failed' | null>(null)

  async function registerApplicant(
    payload: RegisterPayload,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await admissionApi.adminRegisterApplicant(payload)
      applicationId.value = res.data.data.id
      credentials.value = {
        registrationNumber: res.data.data.registrationNumber ?? '',
        email: res.data.data.identifier,
        password: payload.password,
      }
      return { success: true }
    } catch (error: unknown) {
      return {
        success: false,
        error: admissionErrorMessage(error, 'Gagal mendaftarkan pendaftar.'),
      }
    }
  }

  function clearCredentials() {
    credentials.value = null
  }

  function reset() {
    applicationId.value = null
    credentials.value = null
    fetchError.value = null
  }

  async function fetchApplication(): Promise<AdmissionApplication | null> {
    if (!applicationId.value) return null
    fetchError.value = null
    try {
      const res = await admissionApi.getApplicationById(applicationId.value)
      return res.data.data
    } catch (error: unknown) {
      fetchError.value =
        isAxiosError(error) && error.response?.status === 404
          ? 'not-found'
          : 'load-failed'
      if (fetchError.value === 'load-failed')
        toast.error(
          admissionErrorMessage(error, 'Gagal memuat data pendaftar.'),
        )
      return null
    }
  }

  async function updateStep(payload: UpdateApplicationPayload) {
    if (!applicationId.value) return { success: false as const }
    try {
      const res = await admissionApi.adminUpdateApplication(
        applicationId.value,
        payload,
      )
      return { success: true as const, data: res.data.data }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal menyimpan formulir.'))
      return { success: false as const }
    }
  }

  async function uploadDocument(typeCode: string, file: File) {
    if (!applicationId.value) return { success: false as const }
    try {
      await admissionApi.adminUploadDocument(
        applicationId.value,
        typeCode,
        file,
      )
      return { success: true as const }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal mengunggah berkas.'))
      return { success: false as const }
    }
  }

  async function uploadAttachment(file: File): Promise<{ id: string } | null> {
    if (!applicationId.value) return null
    try {
      const res = await admissionApi.adminUploadAttachment(
        applicationId.value,
        file,
      )
      return { id: res.data.data.id }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal mengunggah lampiran.'))
      return null
    }
  }

  async function uploadPaymentProof(payload: PaymentProofPayload, file: File) {
    if (!applicationId.value) return { success: false as const }
    try {
      await admissionApi.adminUploadPaymentProof(
        applicationId.value,
        payload,
        file,
      )
      return { success: true as const }
    } catch (error: unknown) {
      toast.error(
        admissionErrorMessage(error, 'Gagal mengunggah bukti pembayaran.'),
      )
      return { success: false as const }
    }
  }

  async function submit() {
    if (!applicationId.value) return { success: false as const }
    try {
      await admissionApi.adminSubmitApplication(applicationId.value)
      return { success: true as const }
    } catch (error: unknown) {
      toast.error(admissionErrorMessage(error, 'Gagal mengirim formulir.'))
      return { success: false as const }
    }
  }

  return {
    applicationId,
    credentials,
    fetchError,
    registerApplicant,
    clearCredentials,
    reset,
    fetchApplication,
    updateStep,
    uploadDocument,
    uploadAttachment,
    uploadPaymentProof,
    submit,
  }
}
