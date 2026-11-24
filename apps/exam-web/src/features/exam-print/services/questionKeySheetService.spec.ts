import { beforeEach, describe, expect, it, vi } from 'vitest'

const { listActivities, getPackagePrint, loadExamImage } = vi.hoisted(() => ({
  listActivities: vi.fn(),
  getPackagePrint: vi.fn(),
  loadExamImage: vi.fn(),
}))

vi.mock('@/features/exam-activity/api/examActivityApi', () => ({
  examActivityApi: { list: listActivities },
}))
vi.mock('@/features/exam-package/api/examPackageApi', () => ({
  examPackageApi: { getPackagePrint },
}))
vi.mock('@/features/exam-bank/composables/useExamImage', () => ({
  loadExamImage,
}))

import { questionKeySheetService } from './questionKeySheetService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('questionKeySheetService', () => {
  it('filters by eventId, skips activities without a package, deduplicates, and sorts', async () => {
    listActivities.mockResolvedValue([
      {
        id: 'a-other',
        eventId: 'e2',
        subjectId: 's1',
        subjectName: 'Matematika',
        gradeId: 'g7',
        gradeName: 'Kelas 7',
        packageId: 'p0',
        startsAt: '2026-11-23T01:00:00.000Z',
        endsAt: '2026-11-23T02:00:00.000Z',
      },
      {
        id: 'a-paper',
        eventId: 'e1',
        subjectId: 's2',
        subjectName: 'Bahasa Arab',
        gradeId: 'g7',
        gradeName: 'Kelas 7',
        packageId: null,
        startsAt: '2026-11-23T01:00:00.000Z',
        endsAt: '2026-11-23T02:00:00.000Z',
      },
      {
        id: 'a-late',
        eventId: 'e1',
        subjectId: 's1',
        subjectName: 'Matematika',
        gradeId: 'g9',
        gradeName: 'Kelas 9',
        packageId: 'p9',
        startsAt: '2026-11-24T01:00:00.000Z',
        endsAt: '2026-11-24T02:00:00.000Z',
      },
      {
        id: 'a-early',
        eventId: 'e1',
        subjectId: 's1',
        subjectName: 'Matematika',
        gradeId: 'g9',
        gradeName: 'Kelas 9',
        packageId: 'p9',
        startsAt: '2026-11-23T01:00:00.000Z',
        endsAt: '2026-11-23T02:00:00.000Z',
      },
      {
        id: 'a-arab-8',
        eventId: 'e1',
        subjectId: 's2',
        subjectName: 'Bahasa Arab',
        gradeId: 'g8',
        gradeName: 'Kelas 8',
        packageId: 'p8',
        startsAt: '2026-11-23T03:00:00.000Z',
        endsAt: '2026-11-23T04:00:00.000Z',
      },
    ])

    const targets = await questionKeySheetService.loadTargets('e1')

    expect(listActivities).toHaveBeenCalledWith({ category: 'EXAM' })
    expect(targets.map((item) => item.activityId)).toEqual([
      'a-arab-8',
      'a-early',
    ])
  })

  it('loads print packages in batches preserving target order', async () => {
    const targets = Array.from({ length: 7 }, (_, index) => ({
      activityId: `a${index}`,
      eventId: 'e1',
      subjectId: 's1',
      subjectName: 'Matematika',
      gradeId: `g${index}`,
      gradeName: `Kelas ${index}`,
      packageId: `p${index}`,
      startsAt: '2026-11-23T01:00:00.000Z',
      endsAt: '2026-11-23T02:00:00.000Z',
    }))
    getPackagePrint.mockImplementation((id: string) =>
      Promise.resolve({
        id,
        title: `Paket ${id}`,
        items: [],
      }),
    )

    const loaded = await questionKeySheetService.loadSheets(targets)

    expect(getPackagePrint).toHaveBeenCalledTimes(7)
    expect(loaded.map((row) => row.pkg.id)).toEqual(
      targets.map((target) => target.packageId),
    )
  })

  it('preloads unique data-file-id images from question bodies, choices, and essay guides', async () => {
    loadExamImage.mockResolvedValue('blob:ok')
    const id1 = '11111111-1111-4111-8111-111111111111'
    const id2 = '22222222-2222-4222-8222-222222222222'
    const id3 = '33333333-3333-4333-8333-333333333333'

    await questionKeySheetService.preloadSheetImages([
      {
        target: {
          activityId: 'a1',
          eventId: 'e1',
          subjectId: 's1',
          subjectName: 'IPA',
          gradeId: 'g7',
          gradeName: 'Kelas 7',
          packageId: 'p1',
          startsAt: '2026-11-23T01:00:00.000Z',
          endsAt: '2026-11-23T02:00:00.000Z',
        },
        pkg: {
          id: 'p1',
          title: 'IPA 7',
          subjectId: 's1',
          gradeId: 'g7',
          status: 'LOCKED',
          lockedAt: null,
          createdById: 'u1',
          createdAt: '2026-11-23T00:00:00.000Z',
          updatedAt: '2026-11-23T00:00:00.000Z',
          items: [
            {
              questionId: 'q1',
              questionVersion: 1,
              position: 1,
              type: 'MULTIPLE_CHOICE',
              bodyHtml: `<p><img data-file-id="${id1}" /></p>`,
              content: {
                choices: [
                  { key: 'A', html: `<p><img data-file-id="${id2}" /></p>` },
                  { key: 'B', html: `<p><img data-file-id="${id1}" /></p>` },
                ],
                answer: { key: 'A' },
              },
              points: 2,
              resolution: 'NORMAL',
            },
            {
              questionId: 'q2',
              questionVersion: 1,
              position: 2,
              type: 'ESSAY',
              bodyHtml: '<p>Uraian</p>',
              content: {
                guideHtml: `<p><img data-file-id="${id3}" /></p>`,
              },
              points: 5,
              resolution: 'NORMAL',
            },
          ],
        },
      },
    ])

    expect(loadExamImage).toHaveBeenCalledTimes(3)
    expect(loadExamImage).toHaveBeenCalledWith(id1)
    expect(loadExamImage).toHaveBeenCalledWith(id2)
    expect(loadExamImage).toHaveBeenCalledWith(id3)
  })
})
