import { Injectable } from '@nestjs/common'
import { StorageKeyBuilder } from '../../core/storage/storage-key-builder.service.js'
import { StorageService } from '../../core/storage/storage.service.js'
import { AppKey } from '../../shared/domain/enums/app-key.enum.js'
import { IRoomReportFileStorage } from '../domain/repositories/room-report-file-storage.js'

@Injectable()
export class StorageRoomReportFileStorage extends IRoomReportFileStorage {
  constructor(
    private readonly storage: StorageService,
    private readonly keys: StorageKeyBuilder,
  ) {
    super()
  }

  put(fileId: string, content: Buffer, mimeType: string): Promise<string> {
    const key = this.keys.build(AppKey.EXAM, ['room-reports'], fileId)
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
