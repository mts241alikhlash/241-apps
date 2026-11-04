import 'reflect-metadata'
import { IS_PUBLIC_KEY } from '@mts241alikhlash/nest-core/decorators'
import { ProvisioningTokenGuard } from '@mts241alikhlash/nest-core/guards'
import { PERMISSIONS_KEY } from '@mts241alikhlash/nest-core/access-control'
import { ExamScoreController } from './exam-score.controller.js'
import { ExamScoreInternalController } from './exam-score-internal.controller.js'

describe('exam score controllers', () => {
  it('lists with exam-scores.read and has no other route', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        ExamScoreController.prototype.findAll,
      ),
    ).toEqual(['exam-scores.read'])
    expect(
      Object.getOwnPropertyNames(ExamScoreController.prototype).filter(
        (n) => n !== 'constructor',
      ),
    ).toEqual(['findAll'])
  })

  it('receives scores only behind the provisioning token', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, ExamScoreInternalController),
    ).toBe(true)
    const guards = Reflect.getMetadata(
      '__guards__',
      ExamScoreInternalController,
    ) as unknown[]
    expect(guards).toContain(ProvisioningTokenGuard)
    expect(
      Object.getOwnPropertyNames(ExamScoreInternalController.prototype).filter(
        (n) => n !== 'constructor',
      ),
    ).toEqual(['receive'])
  })
})
