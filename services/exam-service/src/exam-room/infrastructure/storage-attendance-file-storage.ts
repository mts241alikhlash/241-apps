import { Injectable } from '@nestjs/common'
import { StorageKeyBuilder } from '../../core/storage/storage-key-builder.service.js'
import { StorageService } from '../../core/storage/storage.service.js'
import { AppKey } from '../../shared/domain/enums/app-key.enum.js'
import { IAttendanceFileStorage } from '../domain/repositories/attendance-file-storage.js'

@Injectable()
export class StorageAttendanceFileStorage extends IAttendanceFileStorage {
  constructor(
    private readonly storage: StorageService,
    private readonly keys: StorageKeyBuilder,
  ) {
    super()
  }

  put(fileId: string, content: Buffer, mimeType: string): Promise<string> {
    const key = this.keys.build(AppKey.EXAM, ['attendance'], fileId)
    return this.storage.uploadFile(content, key, mimeType)
  }

  async read(storageKey: string) {
    const { stream } = await this.storage.getObject(storageKey)
    return { stream }
  }

  delete(storageKey: string): Promise<void> {
    return this.storage.deleteObject(storageKey)
  }
}
