import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  AdmissionAnnouncement,
  AdmissionApplication,
  AdmissionNotification,
} from '../types'

export const useMyApplicationStore = defineStore(
  'admissionMyApplication',
  () => {
    const application = ref<AdmissionApplication | null>(null)
    const notifications = ref<AdmissionNotification[]>([])
    const unreadCount = ref(0)
    const announcements = ref<AdmissionAnnouncement[]>([])
    const loading = ref(false)
    const dashboardError = ref<'not-found' | 'load-failed' | null>(null)
    const formError = ref<'not-found' | 'load-failed' | null>(null)
    const notificationsError = ref(false)
    const announcementsError = ref(false)

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
    }
  },
)
