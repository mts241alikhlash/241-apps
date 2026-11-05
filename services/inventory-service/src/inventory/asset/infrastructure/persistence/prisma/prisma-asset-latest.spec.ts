import { PrismaAssetRepository } from './prisma-asset.repository.js'
import { PrismaAssetUnitRepository } from './prisma-asset-unit.repository.js'
import type { IAssetRepository } from '../../../domain/repositories/asset.repository.js'
import type { PrismaService } from '../../../../../core/database/prisma.service.js'

const lookup = {
  findById: vi.fn().mockResolvedValue(null),
  findIdsAllowingTransactions: vi.fn().mockResolvedValue([]),
}

describe('latest asset records', () => {
  it('excludes soft-deleted assets when selecting a prefix sequence', async () => {
    const findFirst = vi.fn().mockResolvedValue(null)
    const prisma = {
      inventoryAsset: { findFirst },
    } as unknown as PrismaService
    const repository = new PrismaAssetRepository(
      prisma,
      lookup,
      lookup,
      lookup,
      lookup,
      lookup,
    )

    await repository.findLatestAssetByPrefix('AST-COMP/2026/')

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        assetNumber: { startsWith: 'AST-COMP/2026/' },
        deletedAt: null,
      },
      orderBy: { assetNumber: 'desc' },
      select: { assetNumber: true },
    })
  })
})

describe('latest asset units', () => {
  it('excludes soft-deleted units', async () => {
    const findFirst = vi.fn().mockResolvedValue(null)
    const prisma = {
      inventoryAssetUnit: { findFirst },
    } as unknown as PrismaService
    const repository = new PrismaAssetUnitRepository(
      prisma,
      { findReferenceById: vi.fn() } as unknown as IAssetRepository,
      { findById: vi.fn() },
      { findById: vi.fn(), findIdsAllowingTransactions: vi.fn() },
      { findById: vi.fn() },
    )

    await repository.findLatestUnit('asset-1')

    expect(findFirst).toHaveBeenCalledWith({
      where: { assetId: 'asset-1', deletedAt: null },
      orderBy: { unitNumber: 'desc' },
    })
  })
})
