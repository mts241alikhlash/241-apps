import { computed, ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue'
import type { QuestionDetail } from '@/features/exam-bank/types'
import {
  examPackageService,
  type ChangeResult,
} from '../services/examPackageService'
import type { ExamPackageView } from '../types'

const BATCH = 8

export function usePackageReview(id: MaybeRefOrGetter<string>) {
  const pkg = ref<ExamPackageView | null>(null)
  const questions = ref<Record<string, QuestionDetail>>({})
  const notes = ref<Record<string, string>>({})
  const loading = ref(true)
  const loadFailed = ref(false)
  const notFound = ref(false)
  const busy = ref(false)
  const error = ref<string | null>(null)
  const returnError = ref<string | null>(null)
  const unreadable = ref<Set<string>>(new Set())
  let latest = 0

  const canReview = computed(() => pkg.value?.status === 'SUBMITTED')
  const canDecide = computed(
    () => canReview.value && !loading.value && unreadable.value.size === 0,
  )

  async function readQuestion(questionId: string) {
    try {
      const question = await examPackageService.loadQuestion(
        toValue(id),
        questionId,
      )
      return question ?? undefined
    } catch {
      return undefined
    }
  }

  async function load() {
    const ticket = ++latest
    loading.value = true
    loadFailed.value = false
    notFound.value = false
    questions.value = {}
    unreadable.value = new Set()
    try {
      const found = await examPackageService.loadPackage(toValue(id))
      if (ticket !== latest) return
      pkg.value = found
      notFound.value = found === null
      const items = found?.items ?? []
      for (let start = 0; start < items.length; start += BATCH) {
        const slice = items.slice(start, start + BATCH)
        const read = await Promise.all(
          slice.map((item) => readQuestion(item.questionId)),
        )
        if (ticket !== latest) return
        read.forEach((question, index) => {
          const questionId = slice[index].questionId
          if (question) {
            questions.value = { ...questions.value, [questionId]: question }
          } else {
            unreadable.value = new Set([...unreadable.value, questionId])
          }
        })
      }
    } catch {
      if (ticket !== latest) return
      pkg.value = null
      loadFailed.value = true
    }
    loading.value = false
  }

  function setNote(questionId: string, text: string) {
    notes.value = { ...notes.value, [questionId]: text }
  }

  async function decide(
    call: () => Promise<ChangeResult>,
    target: Ref<string | null>,
  ): Promise<boolean> {
    if (busy.value) return false
    busy.value = true
    target.value = null
    const result = await call()
    busy.value = false
    if (!result.success) {
      target.value = result.error
      if (result.status === 409) await load()
    }
    return result.success
  }

  const approve = (note?: string) =>
    decide(
      () =>
        examPackageService.approve(
          toValue(id),
          note?.trim() ? note.trim() : undefined,
        ),
      error,
    )

  function returnPackage(note: string): Promise<boolean> {
    const general = note.trim()
    if (general === '') {
      returnError.value = 'Catatan wajib diisi'
      return Promise.resolve(false)
    }
    const inPackage = new Set((pkg.value?.items ?? []).map((i) => i.questionId))
    const questionNotes = Object.entries(notes.value)
      .filter(
        ([questionId, text]) => inPackage.has(questionId) && text.trim() !== '',
      )
      .map(([questionId, text]) => ({ questionId, note: text.trim() }))
    return decide(
      () =>
        examPackageService.returnPackage(toValue(id), {
          note: general,
          questionNotes,
        }),
      returnError,
    )
  }

  return {
    pkg,
    questions,
    notes,
    loading,
    loadFailed,
    notFound,
    busy,
    error,
    returnError,
    unreadable,
    canReview,
    canDecide,
    load,
    setNote,
    approve,
    returnPackage,
  }
}
