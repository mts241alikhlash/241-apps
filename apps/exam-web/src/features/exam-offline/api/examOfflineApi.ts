import {
  unwrap,
  unwrapBlob,
} from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient } from '@/shared/api/clients'
import type { SaveOfflineScorePayload } from '../types'

const passThrough = (body: unknown) => body as never

const SHEET_FALLBACK_NAME = 'score-sheet.xlsx'

const fileNameOf = (disposition: string | null): string =>
  /filename="?([^";]+)"?/i.exec(disposition ?? '')?.[1] ?? SHEET_FALLBACK_NAME

export const examOfflineApi = {
  schedules: () => unwrap(examClient.GET('/exam-offline/schedules')),

  roster: (scheduleId: string) =>
    unwrap(
      examClient.GET('/exam-offline/schedules/{id}/roster', {
        params: { path: { id: scheduleId } },
      }),
    ),

  save: (
    scheduleId: string,
    studentId: string,
    body: SaveOfflineScorePayload,
  ) =>
    unwrap(
      examClient.PUT('/exam-offline/schedules/{id}/students/{studentId}', {
        params: { path: { id: scheduleId, studentId } },
        body,
      }),
    ),

  importScores: (scheduleId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return unwrap(
      examClient.POST('/exam-offline/schedules/{id}/import', {
        params: { path: { id: scheduleId } },
        body: form as never,
        bodySerializer: passThrough,
      }),
    )
  },

  sheet: async (scheduleId: string) => {
    const request = examClient.GET('/exam-offline/schedules/{id}/sheet', {
      params: { path: { id: scheduleId } },
      parseAs: 'blob',
    })
    const blob = await unwrapBlob(request)
    const { response } = await request
    return {
      blob,
      fileName: fileNameOf(response.headers.get('content-disposition')),
    }
  },

  publish: (scheduleId: string, body: { confirmMissing?: boolean }) =>
    unwrap(
      examClient.POST('/exam-offline/schedules/{id}/publish', {
        params: { path: { id: scheduleId } },
        body,
      }),
    ),
}
