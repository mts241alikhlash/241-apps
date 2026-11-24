import { examActivityApi } from '@/features/exam-activity/api/examActivityApi'
import { loadExamImage } from '@/features/exam-bank/composables/useExamImage'
import type {
  EssayContent,
  MultipleChoiceContent,
  MultipleResponseContent,
} from '@/features/exam-bank/types'
import { examPackageApi } from '@/features/exam-package/api/examPackageApi'
import type { ExamPackagePrint } from '@/features/exam-package/types'
import { compareGrade } from '@/features/exam-shared/classroomName'

export interface QuestionKeyTarget {
  activityId: string
  eventId: string
  subjectId: string
  subjectName: string
  gradeId: string
  gradeName: string
  packageId: string
  startsAt: string
  endsAt: string
}

export interface LoadedQuestionKeySheet {
  target: QuestionKeyTarget
  pkg: ExamPackagePrint
}

const LOAD_BATCH = 6
const FILE_ID_PATTERN = /data-file-id=["']([^"']+)["']/g

function collectIds(html: string | null | undefined, ids: Set<string>) {
  if (!html) return
  for (const match of html.matchAll(FILE_ID_PATTERN)) {
    if (match[1]) ids.add(match[1])
  }
}

export const questionKeySheetService = {
  async loadTargets(eventId: string): Promise<QuestionKeyTarget[]> {
    const activities = await examActivityApi.list({ category: 'EXAM' })
    const byKey = new Map<string, QuestionKeyTarget>()
    for (const activity of activities) {
      if (activity.eventId !== eventId || activity.packageId === null) continue
      const candidate: QuestionKeyTarget = {
        activityId: activity.id,
        eventId: activity.eventId,
        subjectId: activity.subjectId,
        subjectName: activity.subjectName ?? '-',
        gradeId: activity.gradeId,
        gradeName: activity.gradeName ?? '-',
        packageId: activity.packageId,
        startsAt: activity.startsAt,
        endsAt: activity.endsAt,
      }
      const key = `${candidate.subjectId}|${candidate.gradeId}|${candidate.packageId}`
      const current = byKey.get(key)
      if (
        current === undefined ||
        candidate.startsAt.localeCompare(current.startsAt) < 0
      ) {
        byKey.set(key, candidate)
      }
    }
    return [...byKey.values()].sort(
      (left, right) =>
        left.subjectName.localeCompare(right.subjectName, 'id') ||
        compareGrade(left.gradeName, right.gradeName),
    )
  },

  async loadSheets(
    targets: QuestionKeyTarget[],
  ): Promise<LoadedQuestionKeySheet[]> {
    const loaded: LoadedQuestionKeySheet[] = []
    for (let start = 0; start < targets.length; start += LOAD_BATCH) {
      const batch = targets.slice(start, start + LOAD_BATCH)
      const packages = await Promise.all(
        batch.map((target) => examPackageApi.getPackagePrint(target.packageId)),
      )
      batch.forEach((target, index) => {
        loaded.push({ target, pkg: packages[index] })
      })
    }
    return loaded
  },

  async preloadSheetImages(sheets: LoadedQuestionKeySheet[]): Promise<void> {
    const ids = new Set<string>()
    for (const sheet of sheets) {
      for (const item of sheet.pkg.items) {
        collectIds(item.bodyHtml, ids)
        if (
          item.type === 'MULTIPLE_CHOICE' ||
          item.type === 'MULTIPLE_RESPONSE'
        ) {
          const content = item.content as
            MultipleChoiceContent | MultipleResponseContent
          for (const choice of content.choices) collectIds(choice.html, ids)
        } else if (item.type === 'ESSAY') {
          collectIds((item.content as EssayContent).guideHtml, ids)
        }
      }
    }
    if (ids.size === 0) return
    await Promise.allSettled([...ids].map((id) => loadExamImage(id)))
  },
}
