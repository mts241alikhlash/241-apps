import { NotFoundException, StreamableFile } from '@nestjs/common'
import { PERMISSIONS_KEY } from '@mts241alikhlash/nest-core/access-control'
import { IS_PUBLIC_KEY } from '@mts241alikhlash/nest-core/decorators'
import type { Response } from 'express'
import {
  FakeSebConfigRepository,
  FakeSebConfigStorage,
} from '../../application/seb-config.repository.fake.js'
import { SebVerifier } from '../../application/seb-verifier.service.js'
import { ManageSebConfigsUseCase } from '../../application/use-cases/manage-seb-configs/manage-seb-configs.use-case.js'
import {
  SebConfigController,
  SebConfigFileController,
} from './seb-config.controller.js'

const user = { id: 'user-1', roles: [], permissions: [] }
const KEY = 'b'.repeat(64)
const UNKNOWN = '00000000-0000-4000-8000-000000000000'

function build() {
  const repo = new FakeSebConfigRepository()
  const useCase = new ManageSebConfigsUseCase(repo, new FakeSebConfigStorage())
  return {
    useCase,
    controller: new SebConfigController(useCase, new SebVerifier(repo, [])),
    files: new SebConfigFileController(useCase),
  }
}

const createLab = (useCase: ManageSebConfigsUseCase) =>
  useCase.create(user.id, {
    name: 'Lab',
    configKey: KEY,
    originalName: 'lab.seb',
    file: Buffer.from('x'),
  })

describe('SebConfigController', () => {
  it('guards the admin routes with exam-schedules.manage-all', () => {
    for (const handler of [
      SebConfigController.prototype.list,
      SebConfigController.prototype.create,
      SebConfigController.prototype.update,
      SebConfigController.prototype.remove,
    ]) {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([
        'exam-schedules.manage-all',
      ])
    }
  })

  it('lets students list active configurations with exam-sessions.take', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        SebConfigController.prototype.listActive,
      ),
    ).toEqual(['exam-sessions.take'])
  })

  it('marks the public file route as public', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        SebConfigFileController.prototype.download,
      ),
    ).toBe(true)
  })

  it('returns only id and name for active configurations', async () => {
    const { useCase, controller } = build()
    await createLab(useCase)

    expect(await controller.listActive()).toEqual([
      { id: expect.any(String) as string, name: 'Lab' },
    ])
  })

  it('streams the file of an active configuration as application/seb', async () => {
    const { useCase, files } = build()
    const created = await createLab(useCase)
    const set = vi.fn()

    const streamed = await files.download(created.id, {
      set,
    } as unknown as Response)

    expect(streamed).toBeInstanceOf(StreamableFile)
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ 'Content-Type': 'application/seb' }),
    )
  })

  it('returns 404 for an inactive or unknown id on the public file route', async () => {
    const { useCase, files } = build()
    const created = await createLab(useCase)
    await useCase.update(created.id, { active: false })

    await expect(
      files.download(created.id, { set: vi.fn() } as unknown as Response),
    ).rejects.toThrow(NotFoundException)
    await expect(
      files.download(UNKNOWN, { set: vi.fn() } as unknown as Response),
    ).rejects.toThrow(NotFoundException)
  })
})
