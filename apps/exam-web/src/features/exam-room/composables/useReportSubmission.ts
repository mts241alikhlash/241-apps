import { computed, ref } from 'vue'
import type { Outcome } from '../services/examRoomService'
import type { RoomReportSummary } from '../types'
import type { SubjectGroup } from './useReportHierarchy'
import { reportFileProblem } from './reportFile'

export const SUBMIT_CONCURRENCY = 3

export interface SubmissionFailure {
  key: string
  roomName: string
  subjectName: string
  error: string
}

export interface SubjectChoice {
  id: string
  name: string
  draftCount: number
}

export const keyOf = (row: RoomReportSummary): string =>
  `${row.roomId}-${row.slotId}`

export const draftsOf = (rows: RoomReportSummary[]): RoomReportSummary[] => [
  ...new Map(
    rows
      .filter((row) => row.status === 'DRAFT')
      .map((row) => [keyOf(row), row]),
  ).values(),
]

export function useReportSubmission(options: {
  submit: (
    roomId: string,
    slotId: string,
    file: File,
  ) => Promise<Outcome<unknown>>
  refresh: () => Promise<void>
}) {
  const queue = ref<RoomReportSummary[]>([])
  const files = ref<Record<string, File>>({})
  const problems = ref<Record<string, string>>({})
  const subjects = ref<SubjectGroup[]>([])
  const step = ref<'subject' | 'files'>('files')
  const confirmOpen = ref(false)
  const running = ref(false)
  const done = ref(0)
  const runTotal = ref(0)
  const succeeded = ref(0)
  const failures = ref<SubmissionFailure[]>([])
  const resultOpen = ref(false)

  const total = computed(() => queue.value.length)
  const choices = computed<SubjectChoice[]>(() =>
    subjects.value
      .map((subject) => ({
        id: subject.id,
        name: subject.subjectName,
        draftCount: draftsOf(subject.rooms).length,
      }))
      .filter((choice) => choice.draftCount > 0),
  )
  const ready = computed(
    () =>
      step.value === 'files' &&
      queue.value.length > 0 &&
      queue.value.every(
        (row) =>
          files.value[keyOf(row)] !== undefined &&
          problems.value[keyOf(row)] === undefined,
      ),
  )

  function reset() {
    files.value = {}
    problems.value = {}
    failures.value = []
    succeeded.value = 0
    done.value = 0
  }

  function request(rows: RoomReportSummary[]) {
    const drafts = draftsOf(rows)
    if (drafts.length === 0) return
    reset()
    subjects.value = []
    step.value = 'files'
    queue.value = drafts
    confirmOpen.value = true
  }

  function requestDay(daySubjects: SubjectGroup[]) {
    if (!daySubjects.some((subject) => draftsOf(subject.rooms).length > 0)) {
      return
    }
    reset()
    subjects.value = daySubjects
    queue.value = []
    step.value = 'subject'
    confirmOpen.value = true
  }

  function chooseSubject(id: string) {
    const subject = subjects.value.find((item) => item.id === id)
    if (!subject) return
    reset()
    queue.value = draftsOf(subject.rooms)
    step.value = 'files'
  }

  function backToSubjects() {
    reset()
    queue.value = []
    step.value = 'subject'
  }

  function setFile(row: RoomReportSummary, file: File | null) {
    const key = keyOf(row)
    const { [key]: _file, ...restFiles } = files.value
    const { [key]: _problem, ...restProblems } = problems.value
    files.value = restFiles
    problems.value = restProblems
    if (file === null) return
    const problem = reportFileProblem(file)
    if (problem === null) files.value = { ...restFiles, [key]: file }
    else problems.value = { ...restProblems, [key]: problem }
  }

  async function runOne(row: RoomReportSummary) {
    const subjectName = row.subjectNames.join(', ')
    const key = keyOf(row)
    try {
      const result = await options.submit(
        row.roomId,
        row.slotId,
        files.value[key],
      )
      if (result.success) succeeded.value += 1
      else
        failures.value.push({
          key,
          roomName: row.roomName,
          subjectName,
          error: result.error,
        })
    } catch (err: unknown) {
      failures.value.push({
        key,
        roomName: row.roomName,
        subjectName,
        error: err instanceof Error ? err.message : 'Gagal menyerahkan.',
      })
    }
    done.value += 1
  }

  async function run(rows: RoomReportSummary[]) {
    if (running.value) return
    running.value = true
    done.value = 0
    runTotal.value = rows.length
    failures.value = []
    const pending = [...rows]
    const worker = async () => {
      for (let row = pending.shift(); row; row = pending.shift()) {
        await runOne(row)
      }
    }
    try {
      await Promise.all(
        Array.from(
          { length: Math.min(SUBMIT_CONCURRENCY, pending.length) },
          worker,
        ),
      )
    } finally {
      running.value = false
      confirmOpen.value = false
      resultOpen.value = true
    }
    await options.refresh()
  }

  async function confirm() {
    if (!ready.value) return
    await run(queue.value)
  }

  async function retryFailed() {
    const failed = new Set(failures.value.map((item) => item.key))
    const rows = queue.value.filter((row) => failed.has(keyOf(row)))
    if (rows.length === 0) return
    queue.value = rows
    resultOpen.value = false
    await run(rows)
  }

  return {
    queue,
    files,
    problems,
    step,
    choices,
    ready,
    confirmOpen,
    running,
    done,
    runTotal,
    succeeded,
    total,
    failures,
    resultOpen,
    request,
    requestDay,
    chooseSubject,
    backToSubjects,
    setFile,
    confirm,
    retryFailed,
  }
}

export type ReportSubmission = ReturnType<typeof useReportSubmission>
