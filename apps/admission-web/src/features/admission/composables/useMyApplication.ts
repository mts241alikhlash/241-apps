import { storeToRefs } from 'pinia'
import { myApplicationService } from '../services/myApplicationService'
import { useMyApplicationStore } from '../stores/myApplicationStore'

export function useMyApplication() {
  const store = useMyApplicationStore()
  const {
    application,
    notifications,
    unreadCount,
    announcements,
    loading,
    dashboardError,
    formError,
    notificationsError,
    announcementsError,
  } = storeToRefs(store)

  return {
    application,
    notifications,
    unreadCount,
    announcements,
    loading,
    dashboardError,
    formError,
    notificationsError,
    announcementsError,
    fetchDashboard: myApplicationService.fetchDashboard,
    markAllRead: myApplicationService.markAllRead,
    fetchMyApplication: myApplicationService.fetchMyApplication,
    updateStep: myApplicationService.updateStep,
    uploadDocument: myApplicationService.uploadDocument,
    uploadAttachment: myApplicationService.uploadAttachment,
    uploadPaymentProof: myApplicationService.uploadPaymentProof,
    submit: myApplicationService.submit,
  }
}
