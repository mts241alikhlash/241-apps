import { examBankApi } from '../api/examBankApi'
import { isUuid } from '../utils/uuid'

const cache = new Map<string, Promise<string>>()

export function loadExamImage(fileId: string): Promise<string> {
  if (!isUuid(fileId)) return Promise.reject(new Error('Bad file id'))

  const known = cache.get(fileId)
  if (known) return known

  const url = examBankApi
    .getImage(fileId)
    .then((response) => URL.createObjectURL(response.data))
  cache.set(fileId, url)
  url.catch(() => cache.delete(fileId))
  return url
}

export function resetExamImageCache(): void {
  cache.clear()
}
