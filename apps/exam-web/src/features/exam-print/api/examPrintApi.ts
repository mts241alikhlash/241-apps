import {
  unwrap,
  unwrapPage,
} from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient } from '@/shared/api/clients'
import type { PrintPack } from '../types'

export const SCHEDULE_PAGE_LIMIT = 200

export const examPrintApi = {
  getPrintPack: (eventId: string, roomId?: string) =>
    unwrap(
      examClient.GET('/exam-events/{id}/print-pack', {
        params: { path: { id: eventId }, query: { roomId } },
      }),
    ),

  resetCredentials: (eventId: string, roomId?: string) =>
    unwrap(
      examClient.POST('/exam-events/{id}/credentials/reset', {
        params: { path: { id: eventId }, query: { roomId } },
        body: { confirm: true },
      }),
    ),

  getSchedules: (event: PrintPack['event'], page: number) =>
    unwrapPage(
      examClient.GET('/exam-schedules', {
        params: {
          query: {
            page,
            limit: SCHEDULE_PAGE_LIMIT,
            status: 'SCHEDULED',
            from: event.startsAt,
            to: event.endsAt,
          },
        },
      }),
    ),
}
