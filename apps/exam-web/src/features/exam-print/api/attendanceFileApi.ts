import {
  unwrap,
  unwrapBlob,
} from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient } from '@/shared/api/clients'
import type { AttendanceKind, AttendanceTarget } from '../attendanceFileTypes'

const passThrough = (body: unknown) => body as never

export const attendanceFileApi = {
  upload: (
    eventId: string,
    kind: AttendanceKind,
    target: AttendanceTarget,
    file: File,
  ) => {
    const form = new FormData()
    form.append('kind', kind)
    form.append('day', target.day)
    if (target.roomId !== undefined) form.append('roomId', target.roomId)
    if (target.slotId !== undefined) form.append('slotId', target.slotId)
    form.append('file', file)
    return unwrap(
      examClient.PUT('/exam-events/{id}/attendance-files', {
        params: { path: { id: eventId } },
        body: form as never,
        bodySerializer: passThrough,
      }),
    )
  },

  list: (eventId: string, query?: { kind?: AttendanceKind; day?: string }) =>
    unwrap(
      examClient.GET('/exam-events/{id}/attendance-files', {
        params: { path: { id: eventId }, query },
      }),
    ),

  download: (eventId: string, fileId: string) =>
    unwrapBlob(
      examClient.GET('/exam-events/{id}/attendance-files/{fileId}', {
        params: { path: { id: eventId, fileId } },
        parseAs: 'blob',
      }),
    ),
}
