import { vi } from 'vitest'
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import {
  FakeSebConfigRepository,
  FakeSebConfigStorage,
} from '../../seb-config.repository.fake.js'
import { ManageSebConfigsUseCase } from './manage-seb-configs.use-case.js'

const KEY = 'a'.repeat(64)
const file = Buffer.from('<seb:Settings/>')

function build() {
  const configs = new FakeSebConfigRepository()
  const storage = new FakeSebConfigStorage()
  return {
    configs,
    storage,
    useCase: new ManageSebConfigsUseCase(configs, storage),
  }
}

const input = (
  overrides: Partial<{ configKey: string; originalName: string }> = {},
) => ({
  name: 'Lab',
  configKey: KEY,
  originalName: 'lab.seb',
  file,
  ...overrides,
})

describe('ManageSebConfigsUseCase', () => {
  it('stores the file under seb-configs/<id>.seb and lowercases the key', async () => {
    const { storage, useCase } = build()

    const created = await useCase.create(
      'user-1',
      input({ configKey: KEY.toUpperCase() }),
    )

    expect(created.configKey).toBe(KEY)
    expect(created.storageKey).toBe(`seb-configs/${created.id}.seb`)
    expect(storage.objects.get(created.storageKey)).toEqual(file)
  })

  it('rejects a key that is not 64 hex characters', async () => {
    await expect(
      build().useCase.create('user-1', input({ configKey: 'xyz' })),
    ).rejects.toThrow(BadRequestException)
  })

  it('rejects a file that does not end in .seb', async () => {
    await expect(
      build().useCase.create('user-1', input({ originalName: 'lab.txt' })),
    ).rejects.toThrow(BadRequestException)
  })

  it('rejects a duplicate key', async () => {
    const { useCase } = build()
    await useCase.create('user-1', input())

    await expect(
      useCase.create('user-1', input({ configKey: KEY.toUpperCase() })),
    ).rejects.toThrow(ConflictException)
  })

  it('removes a deactivated configuration from listActive and refuses its file', async () => {
    const { useCase } = build()
    const created = await useCase.create('user-1', input())
    expect(await useCase.listActive()).toHaveLength(1)

    await useCase.update(created.id, { active: false })

    expect(await useCase.listActive()).toHaveLength(0)
    await expect(useCase.file(created.id)).rejects.toThrow(NotFoundException)
  })

  it('serves the file of an active configuration', async () => {
    const { useCase } = build()
    const created = await useCase.create('user-1', input())

    const { config, stream } = await useCase.file(created.id)

    expect(config.id).toBe(created.id)
    expect(stream).toBeDefined()
  })

  it('keeps the storage object when deleting the row fails', async () => {
    const { configs, storage, useCase } = build()
    const created = await useCase.create('user-1', input())
    vi.spyOn(configs, 'delete').mockRejectedValueOnce(new Error('db down'))

    await expect(useCase.remove(created.id)).rejects.toThrow('db down')

    expect(storage.objects.has(created.storageKey)).toBe(true)
    expect(configs.configs.has(created.id)).toBe(true)
  })

  it('refuses the file of an unknown id', async () => {
    await expect(
      build().useCase.file('00000000-0000-4000-8000-000000000000'),
    ).rejects.toThrow(NotFoundException)
  })
})
