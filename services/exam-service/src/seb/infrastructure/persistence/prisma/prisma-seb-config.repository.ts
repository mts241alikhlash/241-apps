import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import type { SebConfig } from '../../../domain/entities/seb-config.entity.js'
import {
  ISebConfigRepository,
  type NewSebConfig,
  type SebConfigPatch,
} from '../../../domain/repositories/seb-config.repository.js'

@Injectable()
export class PrismaSebConfigRepository extends ISebConfigRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  list(): Promise<SebConfig[]> {
    return this.prisma.sebConfig.findMany({ orderBy: { createdAt: 'asc' } })
  }

  listActive(): Promise<SebConfig[]> {
    return this.prisma.sebConfig.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  findById(id: string): Promise<SebConfig | null> {
    return this.prisma.sebConfig.findUnique({ where: { id } })
  }

  findByConfigKey(configKey: string): Promise<SebConfig | null> {
    return this.prisma.sebConfig.findUnique({ where: { configKey } })
  }

  create(input: NewSebConfig): Promise<SebConfig> {
    return this.prisma.sebConfig.create({ data: input })
  }

  update(id: string, patch: SebConfigPatch): Promise<SebConfig> {
    return this.prisma.sebConfig.update({ where: { id }, data: patch })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.sebConfig.delete({ where: { id } })
  }
}
