import { NotFoundException } from '@nestjs/common'
import { FakeQuestionRepository } from '../../../../question/application/question.repository.fake.js'
import { FakeExamPackageRepository } from '../../exam-package.repository.fake.js'
import { USER, seedPackage } from '../../exam-package.test-support.js'
import { GetPackagePrintUseCase } from './get-package-print.use-case.js'

describe('GetPackagePrintUseCase', () => {
  it('returns pinned question versions in position order with content and points', async () => {
    const packages = new FakeExamPackageRepository()
    const questions = new FakeQuestionRepository()
    const pkg = await seedPackage(packages, questions, [
      {
        type: 'MULTIPLE_CHOICE',
        bodyHtml: '<p>Versi <b>satu</b></p>',
        content: {
          choices: [
            { key: 'A', html: '<p>Satu</p>' },
            { key: 'B', html: '<p>Dua</p>' },
          ],
          answer: { key: 'A' },
        },
        points: 2,
      },
      {
        type: 'ESSAY',
        bodyHtml: '<p>Jelaskan</p>',
        content: { guideHtml: '<p>Panduan</p>' },
        points: 5,
      },
    ])
    const firstId = pkg.items[0].questionId
    const first = questions.questions.get(firstId)!
    await questions.addVersion(
      firstId,
      {
        bodyHtml: '<p>Versi dua</p>',
        content: first.current.content,
        points: 10,
      },
      USER.id,
    )

    const result = await new GetPackagePrintUseCase(
      packages,
      questions,
    ).execute(pkg.id)

    expect(result.items).toEqual([
      {
        questionId: firstId,
        questionVersion: 1,
        position: 1,
        type: 'MULTIPLE_CHOICE',
        bodyHtml: '<p>Versi <b>satu</b></p>',
        content: {
          choices: [
            { key: 'A', html: '<p>Satu</p>' },
            { key: 'B', html: '<p>Dua</p>' },
          ],
          answer: { key: 'A' },
        },
        points: 2,
        resolution: 'NORMAL',
      },
      {
        questionId: pkg.items[1].questionId,
        questionVersion: 1,
        position: 2,
        type: 'ESSAY',
        bodyHtml: '<p>Jelaskan</p>',
        content: { guideHtml: '<p>Panduan</p>' },
        points: 5,
        resolution: 'NORMAL',
      },
    ])
  })

  it('applies overrideContent on KEY_OVERRIDE and preserves BONUS_ALL resolution', async () => {
    const packages = new FakeExamPackageRepository()
    const questions = new FakeQuestionRepository()
    const pkg = await seedPackage(
      packages,
      questions,
      [
        {
          type: 'MULTIPLE_CHOICE',
          bodyHtml: '<p>Soal 1</p>',
          content: {
            choices: [
              { key: 'A', html: '<p>A</p>' },
              { key: 'B', html: '<p>B</p>' },
            ],
            answer: { key: 'A' },
          },
          points: 2,
        },
        {
          type: 'TRUE_FALSE',
          bodyHtml: '<p>Soal 2</p>',
          content: { answer: { value: true } },
          points: 2,
        },
      ],
      'LOCKED',
    )

    await packages.adjustItemKey({
      packageId: pkg.id,
      questionId: pkg.items[0].questionId,
      resolution: 'KEY_OVERRIDE',
      overrideContent: { answer: { key: 'B' } },
      adjustedById: USER.id,
      adjustedReason: 'Ralat kunci',
      adjustedAt: new Date(),
    })
    await packages.adjustItemKey({
      packageId: pkg.id,
      questionId: pkg.items[1].questionId,
      resolution: 'BONUS_ALL',
      overrideContent: null,
      adjustedById: USER.id,
      adjustedReason: 'Soal bonus',
      adjustedAt: new Date(),
    })

    const result = await new GetPackagePrintUseCase(
      packages,
      questions,
    ).execute(pkg.id)

    expect(result.items[0].resolution).toBe('KEY_OVERRIDE')
    expect(result.items[0].content).toEqual({
      choices: [
        { key: 'A', html: '<p>A</p>' },
        { key: 'B', html: '<p>B</p>' },
      ],
      answer: { key: 'B' },
    })
    expect(result.items[1].resolution).toBe('BONUS_ALL')
    expect(result.items[1].content).toEqual({ answer: { value: true } })
  })

  it('hides drafts of other users and allows approved, locked, or canSeeAll', async () => {
    const packages = new FakeExamPackageRepository()
    const questions = new FakeQuestionRepository()
    const pkg = await seedPackage(packages, questions, [{}], 'DRAFT')
    const useCase = new GetPackagePrintUseCase(packages, questions)

    await expect(
      useCase.execute(pkg.id, { id: 'other-user', canSeeAll: false }),
    ).rejects.toThrow(NotFoundException)

    expect(
      (await useCase.execute(pkg.id, { id: USER.id, canSeeAll: false })).id,
    ).toBe(pkg.id)
    expect(
      (await useCase.execute(pkg.id, { id: 'other-user', canSeeAll: true })).id,
    ).toBe(pkg.id)

    packages.packages.set(pkg.id, { ...pkg, status: 'APPROVED' })
    expect(
      (await useCase.execute(pkg.id, { id: 'other-user', canSeeAll: false }))
        .id,
    ).toBe(pkg.id)
  })

  it('throws NotFoundException when package or pinned version is missing', async () => {
    const packages = new FakeExamPackageRepository()
    const questions = new FakeQuestionRepository()
    const useCase = new GetPackagePrintUseCase(packages, questions)

    await expect(
      useCase.execute('00000000-0000-4000-8000-000000000000'),
    ).rejects.toThrow(NotFoundException)

    const pkg = await seedPackage(packages, questions, [{}])
    const stored = packages.packages.get(pkg.id)!
    packages.packages.set(pkg.id, {
      ...stored,
      items: [{ ...stored.items[0], questionVersion: 99 }],
    })

    await expect(useCase.execute(pkg.id)).rejects.toThrow(NotFoundException)
  })
})
