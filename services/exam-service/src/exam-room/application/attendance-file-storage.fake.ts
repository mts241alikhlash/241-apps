import { Readable } from 'node:stream'
import { IAttendanceFileStorage } from '../domain/repositories/attendance-file-storage.js'

export class FakeAttendanceFileStorage extends IAttendanceFileStorage {
  readonly objects = new Map<string, { content: Buffer; mimeType: string }>()
  failDelete = false

  put(fileId: string, content: Buffer, mimeType: string) {
    const key = `exam/attendance/${fileId}`
    this.objects.set(key, { content, mimeType })
    return Promise.resolve(key)
  }

  read(storageKey: string) {
    const object = this.objects.get(storageKey)
    if (!object) return Promise.reject(new Error(`no object ${storageKey}`))
    return Promise.resolve({ stream: Readable.from(object.content) })
  }

  delete(storageKey: string) {
    if (this.failDelete) return Promise.reject(new Error('delete failed'))
    this.objects.delete(storageKey)
    return Promise.resolve()
  }
}
