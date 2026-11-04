import { storeToRefs } from 'pinia'
import { applicationDetailService } from '../services/applicationDetailService'
import { useApplicationDetailStore } from '../stores/applicationDetailStore'

export function useApplicationDetail() {
  const store = useApplicationDetailStore()
  const { application, loading, acting, error } = storeToRefs(store)

  return {
    application,
    loading,
    acting,
    error,
    fetchDetail: applicationDetailService.fetchDetail,
    approveDocument: applicationDetailService.approveDocument,
    rejectDocument: applicationDetailService.rejectDocument,
    verifyPaymentApprove: applicationDetailService.verifyPaymentApprove,
    rejectPayment: applicationDetailService.rejectPayment,
    requestRevision: applicationDetailService.requestRevision,
    verifyApplication: applicationDetailService.verifyApplication,
    accept: applicationDetailService.accept,
    reject: applicationDetailService.reject,
    enroll: applicationDetailService.enroll,
  }
}
