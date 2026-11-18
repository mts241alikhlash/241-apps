import {
  unwrap,
  unwrapPage,
} from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient } from '@/shared/api/clients'

export const examPrintApi = {
  getPrintPack: (eventId: string, roomId?: string) =>
    unwrap(
      examClient.GET('/exam-events/{id}/print-pack', {
        params: { path: { id: eventId }, query: { roomId } },
      }),
    ),

  getSchedules: (eventId: string) =>
    unwrapPage(
      examClient.GET('/exam-schedules', {
        params: { query: { eventId, limit: 200 } },
      }),
    ),
}
