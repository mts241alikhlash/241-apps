<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogContent,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { sebQuitUrl } from '@/shared/seb'
import QuestionListDialog from '../components/QuestionListDialog.vue'
import QuestionNavPanel from '../components/QuestionNavPanel.vue'
import { useWideScreen } from '../composables/useWideScreen'
import SessionQuestionHtml from '../components/SessionQuestionHtml.vue'
import { useExamSession } from '../composables/useExamSession'
import { isAnswered } from '../logic/exam'
import { API_ERROR_CODES, ExamApiError } from '../services/studentExamService'
import type {
  AnswerPayload,
  Choice,
  PaperQuestion,
  StoredExamSession,
} from '../types'

const route = useRoute()
const router = useRouter()
const sessionId = String(route.params.sessionId ?? '')

const index = ref(0)
const showList = ref(false)
const confirmSubmit = ref(false)
const confirmLeave = ref(false)
const submitting = ref(false)
const submitError = ref<string | null>(null)
const finished = ref(false)
const notStored = ref(false)
const gateNotice = ref<string | null>(null)
const doubtful = ref(new Set<string>())
const examTitle = ref<string | null>(null)
const durationMinutes = ref<number | null>(null)
const timeUpOpen = ref(false)
const timeUpError = ref<string | null>(null)
const offline = ref(false)
const timeUpAutoRetry = ref(true)

const TIME_UP_RETRY_MS = 10_000
const TIME_UP_RETRY_MAX_MS = 60_000
let timeUpFailures = 0
let timeUpTimer: ReturnType<typeof setTimeout> | null = null

let scheduleId: string | null = null

const session = useExamSession({
  onExpired: () => {
    if (finished.value) return
    confirmSubmit.value = false
    confirmLeave.value = false
    showList.value = false
    timeUpOpen.value = true
    void sendTimeUp()
  },
  onDeadlineChanged: (deadline, serverTime) => {
    const key = `cbt:deadline:${sessionId}`
    try {
      const stored = JSON.parse(
        window.sessionStorage.getItem(key) ?? '{}',
      ) as Partial<StoredExamSession>
      window.sessionStorage.setItem(
        key,
        JSON.stringify({
          ...stored,
          deadline,
          serverTime: Date.parse(serverTime),
        }),
      )
    } catch {
      return
    }
  },
  onTokenReentry: () => {
    if (!scheduleId) return
    void router.replace({
      name: 'student-exam-token',
      params: { scheduleId },
      query: { resume: sessionId },
    })
  },
})

const {
  questions,
  answers,
  loading,
  error,
  remainingLabel,
  answeredCount,
  sync,
  syncSummaryLabel,
  submitGateMinutes,
  submitGateSeconds,
  canSubmit,
  answersLocked,
} = session

const controlsLocked = computed(() => submitting.value || answersLocked.value)

onMounted(async () => {
  const raw = window.sessionStorage.getItem(`cbt:deadline:${sessionId}`)
  let stored: StoredExamSession | null
  try {
    stored = raw ? (JSON.parse(raw) as StoredExamSession) : null
  } catch {
    stored = null
  }
  if (stored) {
    session.startClock(stored.deadline, stored.serverTime)
    examTitle.value = stored.examTitle ?? null
    durationMinutes.value = stored.durationMinutes ?? null
    scheduleId = stored.scheduleId ?? null
    session.startHeartbeat(sessionId, stored.heartbeatIntervalMs ?? undefined)
  }
  await session.load(sessionId)
  if (timeUpOpen.value) void sendTimeUp()
})

const current = computed<PaperQuestion | null>(
  () => questions.value[index.value] ?? null,
)
const isLast = computed(() => index.value >= questions.value.length - 1)
const unanswered = computed(() => questions.value.length - answeredCount.value)
const submitStats = computed(() => [
  { label: 'Dijawab', value: answeredCount.value, tone: 'text-success' },
  { label: 'Ragu-ragu', value: doubtful.value.size, tone: 'text-warning' },
  {
    label: 'Belum dijawab',
    value: unanswered.value,
    tone: 'text-destructive',
  },
  {
    label: 'Belum terkirim',
    value: sync.value.pendingCount,
    tone: sync.value.pendingCount > 0 ? 'text-warning' : 'text-success',
  },
])

function answerOf(question: PaperQuestion): AnswerPayload | undefined {
  return answers.value.get(question.id)
}

function keyOf(question: PaperQuestion): string | null {
  const answer = answerOf(question)
  return answer && 'key' in answer ? answer.key : null
}

function keysOf(question: PaperQuestion): Choice['key'][] {
  const answer = answerOf(question)
  return answer && 'keys' in answer ? answer.keys : []
}

function boolOf(question: PaperQuestion): boolean | null {
  const answer = answerOf(question)
  return answer && 'value' in answer ? answer.value : null
}

function textOf(question: PaperQuestion): string {
  const answer = answerOf(question)
  return answer && 'text' in answer ? answer.text : ''
}

function letterOf(position: number): string {
  return String.fromCharCode(65 + position)
}

function choose(question: PaperQuestion, payload: AnswerPayload) {
  session.answer(question, payload)
}

function toggleMulti(question: PaperQuestion, key: Choice['key']) {
  const keys = [...keysOf(question)]
  const position = keys.indexOf(key)
  if (position >= 0) keys.splice(position, 1)
  else keys.push(key)
  keys.sort()
  choose(question, { keys })
}

function toggleDoubtful(question: PaperQuestion) {
  const next = new Set(doubtful.value)
  if (next.has(question.id)) next.delete(question.id)
  else next.add(question.id)
  doubtful.value = next
}

function go(position: number) {
  if (position < 0 || position >= questions.value.length) return
  index.value = position
  showList.value = false
}

function goNext() {
  if (isLast.value) {
    confirmSubmit.value = true
    return
  }
  go(index.value + 1)
}

function finish(answersStored: boolean) {
  clearTimeout(timeUpTimer ?? undefined)
  timeUpTimer = null
  notStored.value = !answersStored
  window.sessionStorage.removeItem(`cbt:deadline:${sessionId}`)
  timeUpOpen.value = false
  finished.value = true
  const quitUrl = sebQuitUrl()
  if (quitUrl) void nextTick(() => window.location.assign(quitUrl))
}

async function sendTimeUp() {
  clearTimeout(timeUpTimer ?? undefined)
  timeUpTimer = null
  if (submitting.value || loading.value || finished.value) return
  submitting.value = true
  timeUpError.value = null
  try {
    if (questions.value.length === 0) {
      await session.load(sessionId)
      if (questions.value.length === 0) {
        throw new ExamApiError(
          error.value ?? 'Soal gagal dimuat.',
          session.errorCode.value,
        )
      }
    }
    const result = await session.submit(sessionId)
    timeUpFailures = 0
    finish(result.answersStored)
  } catch (cause) {
    const code = cause instanceof ExamApiError ? cause.code : null
    if (
      code === API_ERROR_CODES.WINDOW_CLOSED ||
      code === API_ERROR_CODES.SESSION_LOST
    ) {
      finish(false)
      return
    }
    offline.value = !navigator.onLine
    timeUpError.value =
      cause instanceof Error ? cause.message : 'Ujian gagal dikumpulkan.'
    timeUpAutoRetry.value =
      code !== API_ERROR_CODES.SESSION_LOCKED_BY_VIOLATION &&
      code !== API_ERROR_CODES.TOKEN_REENTRY_REQUIRED
    if (!timeUpAutoRetry.value) return
    timeUpFailures += 1
    timeUpTimer = setTimeout(
      () => void sendTimeUp(),
      Math.min(
        TIME_UP_RETRY_MS * 2 ** (timeUpFailures - 1),
        TIME_UP_RETRY_MAX_MS,
      ),
    )
  } finally {
    submitting.value = false
  }
}

function onOnline() {
  offline.value = false
  session.onConnectivityChanged(true)
  if (timeUpOpen.value && timeUpError.value) void sendTimeUp()
}

function onOffline() {
  offline.value = true
  session.onConnectivityChanged(false)
}

async function submitNow() {
  if (submitting.value || session.submitted.value) return
  submitting.value = true
  submitError.value = null
  gateNotice.value = null
  try {
    const result = await session.submit(sessionId)
    finish(result.answersStored)
  } catch (cause) {
    const code = cause instanceof ExamApiError ? cause.code : null
    if (code === API_ERROR_CODES.MIN_SUBMIT) {
      gateNotice.value =
        cause instanceof Error ? cause.message : 'Belum waktunya mengumpulkan.'
    } else if (code === API_ERROR_CODES.WINDOW_CLOSED) {
      submitError.value =
        cause instanceof Error
          ? cause.message
          : 'Waktu pengumpulan sudah habis.'
    } else {
      submitError.value =
        cause instanceof Error ? cause.message : 'Ujian gagal dikumpulkan.'
    }
  } finally {
    submitting.value = false
    confirmSubmit.value = false
    if (timeUpOpen.value && !finished.value) void sendTimeUp()
  }
}

function leave() {
  if (finished.value) {
    void router.replace({ name: 'student-exam-list' })
    return
  }
  confirmLeave.value = true
}

function leaveConfirmed() {
  confirmLeave.value = false
  void router.replace({ name: 'student-exam-list' })
}

const wide = useWideScreen()

const timeUpStatus = computed(() => {
  if (submitting.value || !timeUpError.value) return 'Jawaban sedang dikirim…'
  if (offline.value) {
    return 'Menunggu koneksi… Jawaban tetap tersimpan di perangkat ini.'
  }
  return timeUpAutoRetry.value
    ? 'Jawaban akan dikirim ulang otomatis.'
    : 'Hubungi pengawas, lalu tekan Kirim ulang.'
})

const submitLabel = computed(() =>
  submitting.value
    ? 'Mengirim…'
    : submitGateSeconds.value > 0
      ? `Kumpulkan (${submitGateMinutes.value} mnt)`
      : 'Selesai & Kumpulkan',
)

const nextLabel = computed(() =>
  isLast.value
    ? submitting.value
      ? 'Mengirim…'
      : submitGateSeconds.value > 0
        ? `Kumpulkan (${submitGateMinutes.value} mnt)`
        : 'Kumpulkan'
    : 'Selanjutnya',
)

function onKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented || showList.value) return
  if (confirmSubmit.value || confirmLeave.value || timeUpOpen.value) return
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    go(index.value + 1)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    go(index.value - 1)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
  clearTimeout(timeUpTimer ?? undefined)
})

function statusOf(question: PaperQuestion | null): string {
  if (!question) return ''
  if (doubtful.value.has(question.id)) return 'Ragu-ragu'
  return isAnswered(question, answerOf(question))
    ? 'Sudah dijawab'
    : 'Belum dijawab'
}
</script>

<template>
  <div class="relative flex h-svh flex-col overflow-hidden bg-background">
    <img
      src="/istiqra.webp"
      alt=""
      aria-hidden="true"
      class="pointer-events-none fixed -right-16 bottom-0 w-80 select-none opacity-[0.045]"
    />
    <header
      class="z-20 flex h-[54px] shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4"
    >
      <img
        src="/logo-name.webp"
        alt="MTs Persis 241 Al-Ikhlash"
        class="h-7 w-auto"
        decoding="async"
      />
      <span
        v-if="!wide && !loading && !finished"
        class="text-[19px] font-bold tabular-nums"
        :class="
          remainingLabel <= '05:00' ? 'text-destructive' : 'text-foreground'
        "
      >
        {{ remainingLabel }}
      </span>
    </header>

    <main
      class="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden"
      :class="wide ? 'gap-2 p-2' : 'gap-3 px-4 py-3'"
    >
      <div
        v-if="loading"
        class="space-y-2"
      >
        <Skeleton class="h-28 w-full" />
        <Skeleton class="h-28 w-full" />
      </div>

      <Card
        v-else-if="finished"
        gap="none"
        class="overflow-hidden"
      >
        <CardHeader standard>
          <CardTitle size="lg">Ujian sudah dikumpulkan</CardTitle>
        </CardHeader>
        <CardContent
          variant="standard"
          class="space-y-3 text-center"
        >
          <p
            v-if="notStored"
            class="text-control text-warning"
          >
            Ujian sudah berakhir di server. Jawaban terakhir belum tersimpan dan
            masih menunggu koneksi.
          </p>
          <p
            v-else
            class="text-control text-muted-foreground"
          >
            Jawaban Anda tersimpan. Menunggu penilaian guru bila ada soal
            uraian.
          </p>
          <Button
            size="sm"
            @click="leave"
            >Kembali ke daftar</Button
          >
        </CardContent>
      </Card>

      <template v-else>
        <Card
          v-if="error"
          gap="none"
          class="shrink-0 overflow-hidden"
        >
          <CardContent variant="standard">
            <p class="text-control text-destructive">
              {{ error }}
            </p>
          </CardContent>
        </Card>

        <div
          v-if="!wide && current"
          class="flex shrink-0 items-center gap-3 rounded-[10px] border border-border bg-card px-3.5 py-2.5"
        >
          <span class="min-w-0 flex-1 truncate text-sm font-semibold">
            {{ examTitle ?? '-' }}
          </span>
          <button
            type="button"
            class="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-control font-medium text-primary"
            @click="showList = true"
          >
            <svg
              viewBox="0 0 16 16"
              class="size-4 fill-primary"
              aria-hidden="true"
            >
              <rect
                x="1"
                y="1"
                width="6"
                height="6"
                rx="1.5"
              />
              <rect
                x="9"
                y="1"
                width="6"
                height="6"
                rx="1.5"
              />
              <rect
                x="1"
                y="9"
                width="6"
                height="6"
                rx="1.5"
              />
              <rect
                x="9"
                y="9"
                width="6"
                height="6"
                rx="1.5"
              />
            </svg>
            Daftar Soal
          </button>
        </div>

        <div
          class="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_18rem] md:gap-4"
          :class="wide ? 'gap-2' : 'content-start overflow-y-auto'"
        >
          <Card
            v-if="current"
            gap="none"
            class="flex min-h-0 flex-col md:max-w-[46rem]"
            :class="wide ? 'overflow-hidden' : 'shrink-0 overflow-visible'"
          >
            <CardHeader standard>
              <CardTitle>Soal {{ index + 1 }}</CardTitle>
              <span
                v-if="wide"
                class="text-control text-muted-foreground"
              >
                {{ statusOf(current) }}
              </span>
              <span
                v-else
                class="min-w-0 truncate rounded-md border px-2 py-0.5 text-xs font-medium"
                :class="
                  sync.pendingCount === 0
                    ? 'border-success text-success'
                    : 'border-warning text-warning'
                "
              >
                {{ syncSummaryLabel }}
              </span>
            </CardHeader>

            <CardContent variant="standard">
              <SessionQuestionHtml
                :html="current.bodyHtml"
                :session-id="sessionId"
              />
            </CardContent>

            <div
              v-if="!wide"
              class="border-t border-border bg-foreground/[0.03] px-4 py-2 text-sm font-semibold"
            >
              Jawaban
            </div>

            <CardContent
              variant="standard"
              class="space-y-2 border-t border-border"
            >
              <p
                v-if="current.type === 'MULTIPLE_RESPONSE'"
                class="text-control text-muted-foreground"
              >
                Pilih semua jawaban yang benar
              </p>

              <template v-if="current.type === 'MULTIPLE_CHOICE'">
                <button
                  v-for="(choice, position) in current.choices ?? []"
                  :key="choice.key"
                  type="button"
                  class="flex w-full cursor-pointer items-stretch overflow-hidden rounded-[var(--radius-md)] border text-left min-h-11 md:min-h-[var(--control-h-lg,2.25rem)] disabled:cursor-not-allowed disabled:opacity-60"
                  :class="
                    keyOf(current) === choice.key
                      ? 'border-primary bg-primary/[0.06]'
                      : 'border-input bg-card'
                  "
                  :disabled="controlsLocked"
                  @click="choose(current, { key: choice.key })"
                >
                  <span
                    class="flex w-[var(--control-h-md)] shrink-0 items-center justify-center self-stretch border-r text-control font-semibold"
                    :class="
                      keyOf(current) === choice.key
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-foreground/[0.04] text-muted-foreground'
                    "
                  >
                    {{ letterOf(position) }}
                  </span>
                  <SessionQuestionHtml
                    class="min-w-0 flex-1 px-2.5 py-1.5 [&_p]:!my-0"
                    :html="choice.html"
                    :session-id="sessionId"
                  />
                </button>
              </template>

              <template v-else-if="current.type === 'MULTIPLE_RESPONSE'">
                <p class="text-control text-muted-foreground">
                  Pilih semua jawaban yang benar
                </p>
                <button
                  v-for="(choice, position) in current.choices ?? []"
                  :key="choice.key"
                  type="button"
                  class="flex w-full cursor-pointer items-stretch overflow-hidden rounded-[var(--radius-md)] border text-left min-h-11 md:min-h-[var(--control-h-lg,2.25rem)] disabled:cursor-not-allowed disabled:opacity-60"
                  :class="
                    keysOf(current).includes(choice.key)
                      ? 'border-primary bg-primary/[0.06]'
                      : 'border-input bg-card'
                  "
                  :disabled="controlsLocked"
                  @click="toggleMulti(current, choice.key)"
                >
                  <span
                    class="flex w-[var(--control-h-md)] shrink-0 items-center justify-center self-stretch border-r text-control font-semibold"
                    :class="
                      keysOf(current).includes(choice.key)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-foreground/[0.04] text-muted-foreground'
                    "
                  >
                    {{ letterOf(position) }}
                  </span>
                  <SessionQuestionHtml
                    class="min-w-0 flex-1 px-2.5 py-1.5 [&_p]:!my-0"
                    :html="choice.html"
                    :session-id="sessionId"
                  />
                </button>
              </template>

              <template v-else-if="current.type === 'TRUE_FALSE'">
                <button
                  v-for="option in [
                    { key: 'B', label: 'Benar', value: true },
                    { key: 'S', label: 'Salah', value: false },
                  ]"
                  :key="option.key"
                  type="button"
                  class="flex w-full cursor-pointer items-stretch overflow-hidden rounded-[var(--radius-md)] border text-left min-h-11 md:min-h-[var(--control-h-lg,2.25rem)]"
                  :class="
                    boolOf(current) === option.value
                      ? 'border-primary bg-primary/[0.06]'
                      : 'border-input bg-card'
                  "
                  :disabled="controlsLocked"
                  @click="choose(current, { value: option.value })"
                >
                  <span
                    class="flex w-[var(--control-h-md)] shrink-0 items-center justify-center self-stretch border-r text-control font-semibold"
                    :class="
                      boolOf(current) === option.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-foreground/[0.04] text-muted-foreground'
                    "
                  >
                    {{ option.key }}
                  </span>
                  <span class="min-w-0 flex-1 px-2.5 py-1.5 text-control">
                    {{ option.label }}
                  </span>
                </button>
              </template>

              <Textarea
                v-else
                :model-value="textOf(current)"
                :disabled="controlsLocked"
                :rows="current.type === 'ESSAY' ? 7 : 2"
                maxlength="20000"
                :placeholder="
                  current.type === 'ESSAY' ? 'Jawaban Anda' : 'Jawaban singkat'
                "
                @update:model-value="
                  (value) => current && choose(current, { text: String(value) })
                "
              />
            </CardContent>
            <div
              v-if="wide"
              class="flex items-center gap-2 border-t border-border px-2 py-1.5"
            >
              <Button
                variant="outline"
                size="sm"
                class="min-h-[var(--control-h-lg,2.25rem)] shrink-0"
                :disabled="index === 0 || submitting"
                @click="go(index - 1)"
              >
                Sebelumnya
              </Button>

              <button
                type="button"
                class="flex min-h-[var(--control-h-lg,2.25rem)] shrink-0 items-center gap-1.5 rounded-md border px-3 text-control font-medium transition-colors motion-reduce:transition-none"
                :class="
                  doubtful.has(current.id)
                    ? 'border-warning bg-warning/10 text-warning'
                    : 'border-input bg-card text-muted-foreground'
                "
                :disabled="controlsLocked"
                @click="toggleDoubtful(current)"
              >
                <span
                  class="size-2.5 rounded-sm"
                  :class="doubtful.has(current.id) ? 'bg-warning' : 'bg-input'"
                />
                Ragu-ragu
              </button>

              <Button
                class="ml-auto min-h-[var(--control-h-lg,2.25rem)] shrink-0 font-semibold"
                :class="
                  isLast
                    ? 'bg-success text-white hover:bg-success'
                    : 'bg-primary text-primary-foreground'
                "
                :disabled="controlsLocked || (isLast && !canSubmit)"
                @click="goNext"
              >
                {{ nextLabel }}
              </Button>
            </div>
          </Card>

          <QuestionNavPanel
            v-if="wide && current"
            class="min-h-0"
            :questions="questions"
            :answers="answers"
            :doubtful="doubtful"
            :current-index="index"
            :remaining-label="remainingLabel"
            :sync-label="syncSummaryLabel"
            :submit-label="submitLabel"
            :submit-disabled="controlsLocked || !canSubmit"
            @go="go"
            @submit="confirmSubmit = true"
          />
        </div>
      </template>
    </main>

    <div
      v-if="!wide && !loading && !finished && current"
      class="z-20 shrink-0 border-t border-border bg-card px-2 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]"
    >
      <div class="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          class="h-11 px-2 text-[13px] font-medium"
          :disabled="index === 0 || submitting"
          @click="go(index - 1)"
        >
          Sebelumnya
        </Button>
        <button
          type="button"
          class="h-11 rounded-lg border px-2 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-60"
          :class="
            doubtful.has(current.id)
              ? 'border-warning bg-warning/10 text-warning'
              : 'border-border bg-transparent text-foreground/80'
          "
          :disabled="controlsLocked"
          @click="toggleDoubtful(current)"
        >
          Ragu-ragu
        </button>
        <Button
          class="h-11 px-2 text-[13px] font-medium leading-tight"
          :class="
            isLast
              ? 'bg-success text-white hover:bg-success'
              : 'bg-primary text-primary-foreground'
          "
          :disabled="controlsLocked || (isLast && !canSubmit)"
          @click="goNext"
        >
          {{ nextLabel }}
        </Button>
      </div>
    </div>

    <QuestionListDialog
      v-if="!wide"
      v-model:open="showList"
      :questions="questions"
      :answers="answers"
      :doubtful="doubtful"
      :current-index="index"
      :submit-label="submitLabel"
      :submit-disabled="controlsLocked || !canSubmit"
      @go="go"
      @submit="
        () => {
          showList = false
          confirmSubmit = true
        }
      "
    />

    <Dialog v-model:open="confirmSubmit">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Kumpulkan ujian?</DialogTitle>
        </DialogHeader>
        <div class="space-y-2 px-4 py-3">
          <DialogDescription> Konfirmasi pengumpulan ujian. </DialogDescription>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="stat in submitStats"
              :key="stat.label"
              class="rounded-lg border border-border px-3 py-2"
            >
              <p class="text-xs text-muted-foreground">{{ stat.label }}</p>
              <p
                class="text-lg font-bold"
                :class="stat.tone"
              >
                {{ stat.value }}
              </p>
            </div>
          </div>
          <p
            v-if="unanswered > 0"
            class="text-control font-semibold text-destructive"
          >
            Masih ada {{ unanswered }} soal belum dijawab. Soal kosong bernilai
            0.
          </p>
          <p class="text-xs text-muted-foreground">
            Jawaban tidak dapat diubah setelah dikumpulkan.
          </p>
          <p
            v-if="gateNotice"
            class="text-control text-warning"
          >
            {{ gateNotice }}
          </p>
          <p
            v-if="submitError"
            class="text-control text-destructive"
          >
            {{ submitError }}
          </p>
        </div>
        <DialogFooter
          standard
          class="justify-end gap-2"
        >
          <Button
            variant="outline"
            size="sm"
            :disabled="submitting"
            @click="confirmSubmit = false"
          >
            Periksa Lagi
          </Button>
          <Button
            size="sm"
            :disabled="submitting"
            @click="submitNow"
          >
            {{ submitting ? 'Mengirim…' : 'Kumpulkan' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="confirmLeave">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Keluar dari ujian?</DialogTitle>
        </DialogHeader>
        <div class="px-4 py-3">
          <DialogDescription>
            Konfirmasi keluar dari ujian yang sedang berjalan.
          </DialogDescription>
          <p class="text-control">
            Waktu tetap berjalan dan jawaban yang tersimpan tidak hilang, tetapi
            Anda harus memasukkan token lagi untuk kembali.
          </p>
        </div>
        <DialogFooter
          standard
          class="justify-end gap-2"
        >
          <Button
            variant="outline"
            size="sm"
            @click="confirmLeave = false"
          >
            Tetap di sini
          </Button>
          <Button
            size="sm"
            @click="leaveConfirmed"
            >Keluar</Button
          >
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog :open="timeUpOpen && !finished">
      <DialogContent
        size="md"
        :show-close-button="false"
        @escape-key-down.prevent
        @pointer-down-outside.prevent
        @interact-outside.prevent
      >
        <DialogHeader standard>
          <DialogTitle>Waktu habis</DialogTitle>
          <DialogDescription>
            Jawaban dikirim otomatis dan tidak dapat diubah lagi.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-2">
          <p
            v-if="timeUpError && !submitting"
            role="alert"
            class="text-control text-destructive"
          >
            {{ timeUpError }}
          </p>
          <p
            class="text-control"
            :class="timeUpError && !submitting ? 'text-muted-foreground' : ''"
            aria-live="polite"
          >
            {{ timeUpStatus }}
          </p>
        </DialogBody>
        <DialogFooter
          v-if="timeUpError && !submitting"
          standard
        >
          <Button
            size="sm"
            @click="sendTimeUp"
          >
            Kirim ulang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
