import type { AdmissionNotificationType } from '@mts241alikhlash/nest-core/domain'

export interface AdmissionNotificationEntity {
  id: string
  applicationId: string
  type: `${AdmissionNotificationType}`
  title: string
  message: string
  readAt: Date | null
  createdAt: Date
}
