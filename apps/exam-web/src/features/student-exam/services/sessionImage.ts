import api from '@mts241alikhlash/web-shared/utils/api'

const cache = new Map<string, Promise<string>>()

export function loadSessionImage(
  sessionId: string,
  deviceId: string,
  fileId: string,
): Promise<string> {
  const key = `${sessionId}:${fileId}`
  const known = cache.get(key)
  if (known) return known

  const request = api
    .get<Blob>(
      `/student-exams/${encodeURIComponent(sessionId)}/files/${encodeURIComponent(fileId)}`,
      {
        responseType: 'blob',
        headers: { 'X-Device-Id': deviceId },
      },
    )
    .then((response) => URL.createObjectURL(response.data))
  cache.set(key, request)
  request.catch(() => cache.delete(key))
  return request
}

export function clearSessionImageCache(): void {
  cache.clear()
}
