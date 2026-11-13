import type { Readable } from 'node:stream'

export abstract class ISebConfigStorage {
  abstract put(storageKey: string, content: Buffer): Promise<void>
  abstract read(storageKey: string): Promise<{ stream: Readable }>
  abstract delete(storageKey: string): Promise<void>
}
