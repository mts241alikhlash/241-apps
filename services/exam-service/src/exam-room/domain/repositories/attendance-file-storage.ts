import type { Readable } from 'node:stream'

export abstract class IAttendanceFileStorage {
  abstract put(
    fileId: string,
    content: Buffer,
    mimeType: string,
  ): Promise<string>
  abstract read(storageKey: string): Promise<{ stream: Readable }>
  abstract delete(storageKey: string): Promise<void>
}
