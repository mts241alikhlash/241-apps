import { unwrapBlob } from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient } from '@/shared/api/clients'

const cache = new Map<string, Promise<string>>()

export function loadSessionImage(
  sessionId: string,
  deviceId: string,
  fileId: string,
): Promise<string> {
  const key = `${sessionId}:${fileId}`
  const known = cache.get(key)
  if (known) return known

  const request = unwrapBlob(
    examClient.GET('/student-exams/{sessionId}/files/{fileId}', {
      params: {
        path: { sessionId, fileId },
        header: { 'X-Device-Id': deviceId },
      },
      parseAs: 'blob',
    }),
  ).then((blob) => URL.createObjectURL(blob))
  cache.set(key, request)
  request.catch(() => cache.delete(key))
  return request
}

export function clearSessionImageCache(): void {
  cache.clear()
}
