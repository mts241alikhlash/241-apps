import { Injectable } from '@nestjs/common'
import { StorageService } from '../../core/storage/storage.service.js'
import { ISebConfigStorage } from '../domain/repositories/seb-config-storage.js'

@Injectable()
export class StorageSebConfigStorage extends ISebConfigStorage {
  constructor(private readonly storage: StorageService) {
    super()
  }

  async put(storageKey: string, content: Buffer): Promise<void> {
    await this.storage.uploadFile(content, storageKey, 'application/seb')
  }

  read(storageKey: string) {
    return this.storage.getObject(storageKey).then(({ stream }) => ({ stream }))
  }

  delete(storageKey: string): Promise<void> {
    return this.storage.deleteObject(storageKey)
  }
}
