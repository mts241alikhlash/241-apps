import { randomUUID } from 'node:crypto'
import type { Readable } from 'node:stream'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { SebConfig } from '../../../domain/entities/seb-config.entity.js'
import {
  ISebConfigRepository,
  type SebConfigPatch,
} from '../../../domain/repositories/seb-config.repository.js'
import { ISebConfigStorage } from '../../../domain/repositories/seb-config-storage.js'

export const SEB_CONFIG_MAX_BYTES = 1024 * 1024
const CONFIG_KEY_PATTERN = /^[0-9a-f]{64}$/

export interface CreateSebConfigInput {
  name: string
  configKey: string
  originalName: string
  file: Buffer
}

@Injectable()
export class ManageSebConfigsUseCase {
  constructor(
    private readonly configs: ISebConfigRepository,
    private readonly storage: ISebConfigStorage,
  ) {}

  list(): Promise<SebConfig[]> {
    return this.configs.list()
  }

  listActive(): Promise<SebConfig[]> {
    return this.configs.listActive()
  }

  async create(
    userId: string,
    input: CreateSebConfigInput,
  ): Promise<SebConfig> {
    const configKey = input.configKey.toLowerCase()
    if (!CONFIG_KEY_PATTERN.test(configKey)) {
      throw new BadRequestException('Config Key harus 64 karakter heksadesimal')
    }
    if (!input.originalName.toLowerCase().endsWith('.seb')) {
      throw new BadRequestException('Berkas konfigurasi harus berakhiran .seb')
    }
    if (input.file.length > SEB_CONFIG_MAX_BYTES) {
      throw new BadRequestException('Berkas konfigurasi melebihi 1 MB')
    }
    if (await this.configs.findByConfigKey(configKey)) {
      throw new ConflictException('Config Key sudah terdaftar')
    }

    const id = randomUUID()
    const storageKey = `seb-configs/${id}.seb`
    await this.storage.put(storageKey, input.file)
    return this.configs.create({
      id,
      name: input.name,
      configKey,
      storageKey,
      active: true,
      createdById: userId,
    })
  }

  async update(id: string, patch: SebConfigPatch): Promise<SebConfig> {
    await this.require(id)
    return this.configs.update(id, patch)
  }

  async remove(id: string): Promise<void> {
    const config = await this.require(id)
    await this.storage.delete(config.storageKey)
    await this.configs.delete(id)
  }

  async file(id: string): Promise<{ config: SebConfig; stream: Readable }> {
    const config = await this.configs.findById(id)
    if (!config?.active) {
      throw new NotFoundException('Konfigurasi SEB tidak ditemukan')
    }
    const { stream } = await this.storage.read(config.storageKey)
    return { config, stream }
  }

  private async require(id: string): Promise<SebConfig> {
    const config = await this.configs.findById(id)
    if (!config) throw new NotFoundException('Konfigurasi SEB tidak ditemukan')
    return config
  }
}
