import { computed, ref } from 'vue'
import { reportFileProblem } from '@/features/exam-room/composables/reportFile'
import type { Outcome } from '@/features/exam-room/services/examRoomService'
import type {
  AttendanceFailure,
  AttendanceTarget,
} from '../attendanceFileTypes'

export const ATTENDANCE_UPLOAD_CONCURRENCY = 3

export function useAttendanceUpload(options: {
  upload: (target: AttendanceTarget, file: File) => Promise<Outcome<unknown>>
}) {
  const targets = ref<AttendanceTarget[]>([])
  const files = ref<Record<string, File>>({})
  const problems = ref<Record<string, string>>({})
  const running = ref(false)
  const done = ref(0)
  const runTotal = ref(0)
  const succeeded = ref(0)
  const failures = ref<AttendanceFailure[]>([])
  const finished = ref(false)

  const ready = computed(
    () =>
      targets.value.length > 0 &&
      targets.value.every(
        (target) =>
          files.value[target.key] !== undefined &&
          problems.value[target.key] === undefined,
      ),
  )

  function start(next: AttendanceTarget[]) {
    targets.value = next
    files.value = {}
    problems.value = {}
    failures.value = []
    succeeded.value = 0
    done.value = 0
    runTotal.value = 0
    finished.value = false
  }

  function setFile(key: string, file: File | null) {
    const { [key]: _file, ...restFiles } = files.value
    const { [key]: _problem, ...restProblems } = problems.value
    files.value = restFiles
    problems.value = restProblems
    if (file === null) return
    const problem = reportFileProblem(file)
    if (problem === null) files.value = { ...restFiles, [key]: file }
    else problems.value = { ...restProblems, [key]: problem }
  }

  async function runOne(target: AttendanceTarget) {
    try {
      const result = await options.upload(target, files.value[target.key])
      if (result.success) succeeded.value += 1
      else
        failures.value.push({
          key: target.key,
          label: target.label,
          error: result.error,
        })
    } catch (err: unknown) {
      failures.value.push({
        key: target.key,
        label: target.label,
        error: err instanceof Error ? err.message : 'Gagal mengunggah.',
      })
    }
    done.value += 1
  }

  async function run(list: AttendanceTarget[]) {
    if (running.value) return
    running.value = true
    done.value = 0
    runTotal.value = list.length
    failures.value = []
    const pending = [...list]
    const worker = async () => {
      for (let item = pending.shift(); item; item = pending.shift()) {
        await runOne(item)
      }
    }
    try {
      await Promise.all(
        Array.from(
          { length: Math.min(ATTENDANCE_UPLOAD_CONCURRENCY, pending.length) },
          worker,
        ),
      )
    } finally {
      running.value = false
      finished.value = true
    }
  }

  async function confirm() {
    if (!ready.value) return
    await run(targets.value)
  }

  async function retryFailed() {
    const failed = new Set(failures.value.map((item) => item.key))
    const list = targets.value.filter((target) => failed.has(target.key))
    if (list.length === 0) return
    targets.value = list
    finished.value = false
    await run(list)
  }

  return {
    targets,
    files,
    problems,
    ready,
    running,
    done,
    runTotal,
    succeeded,
    failures,
    finished,
    start,
    setFile,
    confirm,
    retryFailed,
  }
}

export type AttendanceUpload = ReturnType<typeof useAttendanceUpload>
