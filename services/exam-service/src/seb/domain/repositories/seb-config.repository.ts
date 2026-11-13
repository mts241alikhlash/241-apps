import type { SebConfig } from '../entities/seb-config.entity.js'

export type NewSebConfig = Omit<SebConfig, 'createdAt' | 'updatedAt'>
export type SebConfigPatch = Partial<Pick<SebConfig, 'name' | 'active'>>

export abstract class ISebConfigRepository {
  abstract list(): Promise<SebConfig[]>
  abstract listActive(): Promise<SebConfig[]>
  abstract findById(id: string): Promise<SebConfig | null>
  abstract findByConfigKey(configKey: string): Promise<SebConfig | null>
  abstract create(input: NewSebConfig): Promise<SebConfig>
  abstract update(id: string, patch: SebConfigPatch): Promise<SebConfig>
  abstract delete(id: string): Promise<void>
}
