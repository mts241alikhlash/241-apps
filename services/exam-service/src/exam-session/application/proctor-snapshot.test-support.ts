import { Readable } from 'node:stream'
import type { StorageService } from '../../core/storage/storage.service.js'

export interface FakeStorageCalls {
  uploaded: { key: string; size: number; mimeType: string }[]
  deleted: string[]
}

export function fakeStorage(failOn: string[] = []): {
  storage: StorageService
  calls: FakeStorageCalls
} {
  const calls: FakeStorageCalls = { uploaded: [], deleted: [] }
  const storage = {
    uploadFile: (buffer: Buffer, key: string, mimeType: string) => {
      calls.uploaded.push({ key, size: buffer.length, mimeType })
      return Promise.resolve(key)
    },
    deleteObject: (key: string) => {
      if (failOn.includes(key)) return Promise.reject(new Error('minio down'))
      calls.deleted.push(key)
      return Promise.resolve()
    },
    getObject: (key: string) =>
      Promise.resolve({
        stream: Readable.from([Buffer.from(key)]),
        contentLength: Buffer.byteLength(key),
      }),
  } as unknown as StorageService
  return { storage, calls }
}
