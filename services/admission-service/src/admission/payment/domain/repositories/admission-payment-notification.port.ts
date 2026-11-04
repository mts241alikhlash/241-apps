import type { AdmissionNotificationType } from '@mts241alikhlash/nest-core/domain'

export abstract class IAdmissionPaymentNotificationPort {
  abstract notify(
    applicationId: string,
    type: `${AdmissionNotificationType}`,
    title: string,
    message: string,
  ): Promise<void>
}
