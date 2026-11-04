import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useAuthSession } from '@/features/platform/auth'
import {
  examPackageService,
  type ChangeResult,
} from '../services/examPackageService'
import type {
  ExamPackageStatus,
  ExamPackageView,
  PackageReview,
} from '../types'

const EDITABLE: ExamPackageStatus[] = ['DRAFT', 'RETURNED', 'APPROVED']
const SUBMITTABLE: ExamPackageStatus[] = ['DRAFT', 'RETURNED']

export function usePackageBuilder(id: MaybeRefOrGetter<string>) {
  const { user, hasPermission } = useAuthSession()
  const pkg = ref<ExamPackageView | null>(null)
  const loading = ref(true)
  const loadFailed = ref(false)
  const notFound = ref(false)
  const busy = ref(false)
  const error = ref<string | null>(null)

  const owns = computed(
    () =>
      pkg.value !== null &&
      (pkg.value.createdById === user.value?.id ||
        hasPermission('exam-questions.manage-all')),
  )

  const canEdit = computed(() => {
    const current = pkg.value
    if (current === null || !hasPermission('exam-packages.update')) {
      return false
    }
    return EDITABLE.includes(current.status) && owns.value
  })

  const canSubmit = computed(
    () =>
      canEdit.value &&
      SUBMITTABLE.includes(pkg.value?.status ?? 'LOCKED') &&
      (pkg.value?.items.length ?? 0) > 0,
  )

  const lastReturn = computed<PackageReview | null>(() => {
    const current = pkg.value
    if (current?.status !== 'RETURNED') return null
    return (
      [...current.reviews].reverse().find((r) => r.action === 'RETURN') ?? null
    )
  })

  const noteOf = (questionId: string): string | undefined =>
    lastReturn.value?.questionNotes.find((n) => n.questionId === questionId)
      ?.note

  watch(
    () => toValue(id),
    () => {
      error.value = null
    },
  )

  let latest = 0

  async function load() {
    const ticket = ++latest
    loading.value = true
    loadFailed.value = false
    notFound.value = false
    try {
      const found = await examPackageService.loadPackage(toValue(id))
      if (ticket !== latest) return
      pkg.value = found
      notFound.value = found === null
    } catch {
      if (ticket !== latest) return
      pkg.value = null
      loadFailed.value = true
    }
    loading.value = false
  }

  async function run(call: () => Promise<ChangeResult>): Promise<boolean> {
    if (busy.value) return false
    busy.value = true
    error.value = null
    const result = await call()
    if (!result.success) error.value = result.error
    if (result.success || result.status === 409) await load()
    busy.value = false
    return result.success
  }

  function move(questionId: string, direction: 'up' | 'down') {
    const order = (pkg.value?.items ?? []).map((item) => item.questionId)
    const from = order.indexOf(questionId)
    const to = direction === 'up' ? from - 1 : from + 1
    if (from < 0 || to < 0 || to >= order.length) return Promise.resolve(false)
    ;[order[from], order[to]] = [order[to], order[from]]
    return run(() => examPackageService.reorder(toValue(id), order))
  }

  function remove(questionId: string) {
    return run(() => examPackageService.removeQuestion(toValue(id), questionId))
  }

  async function submit() {
    if ((pkg.value?.items.length ?? 0) === 0) {
      error.value = 'Paket belum berisi soal'
      return
    }
    await run(() => examPackageService.submit(toValue(id)))
  }

  return {
    pkg,
    loading,
    loadFailed,
    notFound,
    busy,
    error,
    owns,
    canEdit,
    canSubmit,
    lastReturn,
    noteOf,
    load,
    move,
    remove,
    submit,
  }
}
