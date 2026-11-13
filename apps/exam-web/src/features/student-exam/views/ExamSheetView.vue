<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
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

let scheduleId: string | null = null

const session = useExamSession({
  onExpired: () => {
    if (!finished.value) void submitNow()
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
})

const current = computed<PaperQuestion | null>(
  () => questions.value[index.value] ?? null,
)
const isLast = computed(() => index.value >= questions.value.length - 1)
const unanswered = computed(() => questions.value.length - answeredCount.value)

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

async function submitNow() {
  if (submitting.value || answersLocked.value) return
  submitting.value = true
  submitError.value = null
  gateNotice.value = null
  try {
    const result = await session.submit(sessionId)
    notStored.value = !result.answersStored
    window.sessionStorage.removeItem(`cbt:deadline:${sessionId}`)
    const quitUrl = sebQuitUrl()
    if (quitUrl) {
      window.location.assign(quitUrl)
      return
    }
    finished.value = true
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
  if (confirmSubmit.value || confirmLeave.value) return
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

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function statusOf(question: PaperQuestion | null): string {
  if (!question) return ''
  if (doubtful.value.has(question.id)) return 'Ragu-ragu'
  return isAnswered(question, answerOf(question))
    ? 'Sudah dijawab'
    : 'Belum dijawab'
}
</script>

<template>
  <div
    class="relative flex h-svh flex-col overflow-hidden bg-background"
    @online="session.onConnectivityChanged(true)"
    @offline="session.onConnectivityChanged(false)"
  >
    <img
      src="/logo.webp"
      alt=""
      aria-hidden="true"
      class="pointer-events-none fixed -right-16 bottom-0 w-80 select-none opacity-[0.045]"
    />
    <header
      class="z-20 flex h-[54px] shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4"
    >
      <img
        src="/logo-name.webp"
        alt="241 Exam"
        class="h-7 w-auto"
        decoding="async"
      />
      <span
        v-if="!wide && !loading && !finished"
        class="flex min-w-0 items-center gap-2"
      >
        <span
          class="rounded-md border border-border bg-muted px-2 py-1 text-[length:var(--text-control)] font-semibold tabular-nums"
          :class="
            remainingLabel <= '05:00' ? 'text-destructive' : 'text-foreground'
          "
        >
          {{ remainingLabel }}
        </span>
        <span
          class="truncate rounded-md border px-2 py-1 text-[length:var(--text-control)] font-medium"
          :class="
            sync.pendingCount === 0
              ? 'border-green-600 text-green-700'
              : 'border-amber-500 text-amber-700'
          "
        >
          {{ syncSummaryLabel }}
        </span>
      </span>
    </header>

    <main
      class="relative flex min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden p-2"
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
            class="text-[length:var(--text-control)] text-amber-700"
          >
            Ujian sudah berakhir di server. Jawaban terakhir belum tersimpan dan
            masih menunggu koneksi.
          </p>
          <p
            v-else
            class="text-[length:var(--text-control)] text-muted-foreground"
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
            <p class="text-[length:var(--text-control)] text-destructive">
              {{ error }}
            </p>
          </CardContent>
        </Card>

        <div
          class="grid min-h-0 flex-1 gap-2 md:grid-cols-[minmax(0,1fr)_18rem] md:gap-4"
        >
          <Card
            v-if="current"
            gap="none"
            class="flex min-h-0 flex-col overflow-hidden md:max-w-[46rem]"
          >
            <CardHeader standard>
              <CardTitle>Soal {{ index + 1 }}</CardTitle>
              <div class="flex items-center gap-2">
                <span
                  class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
                >
                  {{ statusOf(current) }}
                </span>
                <Button
                  v-if="!wide"
                  variant="outline"
                  size="sm"
                  class="min-h-11"
                  @click="showList = true"
                >
                  Daftar Soal
                </Button>
              </div>
            </CardHeader>

            <CardContent variant="standard">
              <SessionQuestionHtml
                :html="current.bodyHtml"
                :session-id="sessionId"
              />
            </CardContent>

            <CardContent
              variant="standard"
              class="space-y-2 border-t border-border"
            >
              <p
                v-if="current.type === 'MULTIPLE_RESPONSE'"
                class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
              >
                Pilih semua jawaban yang benar
              </p>

              <template v-if="current.type === 'MULTIPLE_CHOICE'">
                <button
                  v-for="(choice, position) in current.choices ?? []"
                  :key="choice.key"
                  type="button"
                  class="flex w-full cursor-pointer items-stretch overflow-hidden rounded-[var(--radius-md)] border text-left min-h-11 disabled:cursor-not-allowed disabled:opacity-60"
                  :class="
                    keyOf(current) === choice.key
                      ? 'border-primary bg-primary/[0.06]'
                      : 'border-input bg-card'
                  "
                  :disabled="controlsLocked"
                  @click="choose(current, { key: choice.key })"
                >
                  <span
                    class="flex w-[var(--control-h-md)] shrink-0 items-center justify-center self-stretch border-r text-[length:var(--text-control)] font-semibold"
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
                <p
                  class="text-[length:var(--text-control)] text-muted-foreground"
                >
                  Pilih semua jawaban yang benar
                </p>
                <button
                  v-for="(choice, position) in current.choices ?? []"
                  :key="choice.key"
                  type="button"
                  class="flex w-full cursor-pointer items-stretch overflow-hidden rounded-[var(--radius-md)] border text-left min-h-11 disabled:cursor-not-allowed disabled:opacity-60"
                  :class="
                    keysOf(current).includes(choice.key)
                      ? 'border-primary bg-primary/[0.06]'
                      : 'border-input bg-card'
                  "
                  :disabled="controlsLocked"
                  @click="toggleMulti(current, choice.key)"
                >
                  <span
                    class="flex w-[var(--control-h-md)] shrink-0 items-center justify-center self-stretch border-r text-[length:var(--text-control)] font-semibold"
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
                  class="flex w-full cursor-pointer items-stretch overflow-hidden rounded-[var(--radius-md)] border text-left min-h-11"
                  :class="
                    boolOf(current) === option.value
                      ? 'border-primary bg-primary/[0.06]'
                      : 'border-input bg-card'
                  "
                  :disabled="controlsLocked"
                  @click="choose(current, { value: option.value })"
                >
                  <span
                    class="flex w-[var(--control-h-md)] shrink-0 items-center justify-center self-stretch border-r text-[length:var(--text-control)] font-semibold"
                    :class="
                      boolOf(current) === option.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-foreground/[0.04] text-muted-foreground'
                    "
                  >
                    {{ option.key }}
                  </span>
                  <span
                    class="min-w-0 flex-1 px-2.5 py-1.5 text-[length:var(--text-control)]"
                  >
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
              class="flex items-center gap-2 border-t border-border px-2 py-1.5"
            >
              <Button
                variant="outline"
                size="sm"
                class="min-h-11 shrink-0"
                :disabled="index === 0 || submitting"
                @click="go(index - 1)"
              >
                Sebelumnya
              </Button>

              <button
                type="button"
                class="flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border px-3 text-[length:var(--text-control)] font-medium transition-colors motion-reduce:transition-none"
                :class="
                  doubtful.has(current.id)
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-input bg-card text-muted-foreground'
                "
                :disabled="controlsLocked"
                @click="toggleDoubtful(current)"
              >
                <span
                  class="size-2.5 rounded-sm"
                  :class="
                    doubtful.has(current.id) ? 'bg-amber-500' : 'bg-input'
                  "
                />
                Ragu-ragu
              </button>

              <Button
                class="ml-auto min-h-11 shrink-0 font-semibold"
                :class="
                  isLast
                    ? 'bg-green-700 text-white hover:bg-green-800'
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

    <QuestionListDialog
      v-if="!wide"
      v-model:open="showList"
      :questions="questions"
      :answers="answers"
      :doubtful="doubtful"
      :current-index="index"
      @go="go"
    />

    <Dialog v-model:open="confirmSubmit">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Kumpulkan ujian?</DialogTitle>
        </DialogHeader>
        <div class="space-y-2 px-4 py-3">
          <DialogDescription>
            Masih ada {{ unanswered }} soal belum dijawab. Jawaban tidak bisa
            diubah setelah dikumpulkan.
          </DialogDescription>
          <p
            v-if="gateNotice"
            class="text-[length:var(--text-control)] text-amber-700"
          >
            {{ gateNotice }}
          </p>
          <p
            v-if="submitError"
            class="text-[length:var(--text-control)] text-destructive"
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
            Batal
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
            Ujian masih berjalan. Waktu tetap berjalan dan jawaban yang
            tersimpan tidak hilang, tetapi Anda harus memasukkan token lagi
            untuk kembali.
          </DialogDescription>
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
  </div>
</template>
