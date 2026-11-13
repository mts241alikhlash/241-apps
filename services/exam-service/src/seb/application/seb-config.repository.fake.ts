import { Readable } from 'node:stream'
import type { SebConfig } from '../domain/entities/seb-config.entity.js'
import {
  ISebConfigRepository,
  type NewSebConfig,
  type SebConfigPatch,
} from '../domain/repositories/seb-config.repository.js'
import { ISebConfigStorage } from '../domain/repositories/seb-config-storage.js'

export class FakeSebConfigRepository extends ISebConfigRepository {
  readonly configs = new Map<string, SebConfig>()

  list() {
    return Promise.resolve([...this.configs.values()])
  }

  listActive() {
    return Promise.resolve([...this.configs.values()].filter((c) => c.active))
  }

  findById(id: string) {
    return Promise.resolve(this.configs.get(id) ?? null)
  }

  findByConfigKey(configKey: string) {
    const found = [...this.configs.values()].find(
      (c) => c.configKey === configKey,
    )
    return Promise.resolve(found ?? null)
  }

  create(input: NewSebConfig) {
    const now = new Date()
    const config = { ...input, createdAt: now, updatedAt: now }
    this.configs.set(config.id, config)
    return Promise.resolve(config)
  }

  update(id: string, patch: SebConfigPatch) {
    const config = { ...this.configs.get(id)!, ...patch, updatedAt: new Date() }
    this.configs.set(id, config)
    return Promise.resolve(config)
  }

  delete(id: string) {
    this.configs.delete(id)
    return Promise.resolve()
  }
}

export class FakeSebConfigStorage extends ISebConfigStorage {
  readonly objects = new Map<string, Buffer>()

  put(storageKey: string, content: Buffer) {
    this.objects.set(storageKey, content)
    return Promise.resolve()
  }

  read(storageKey: string) {
    const content = this.objects.get(storageKey)
    if (!content) return Promise.reject(new Error(`no object ${storageKey}`))
    return Promise.resolve({ stream: Readable.from(content) })
  }

  delete(storageKey: string) {
    this.objects.delete(storageKey)
    return Promise.resolve()
  }
}
