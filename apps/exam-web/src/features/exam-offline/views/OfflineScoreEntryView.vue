<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BackButton, DataTable, DataTableEmpty } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { buildOfflineEntryColumns } from '../components/offlineScoreColumns'
import ScoreImportDialog from '../components/ScoreImportDialog.vue'
import { useOfflineScoreEntry } from '../composables/useOfflineScoreEntry'
import { examOfflineService } from '../services/examOfflineService'
import {
  OFFLINE_SCORES_PATH,
  SENT_BEFORE_ABSENT_WARNING,
  offlineKindLabel,
} from '../types'
import { pastedLines } from '../utils/score'

const route = useRoute()
const router = useRouter()
const { hasPermission } = useAuthSession()
const scheduleId = computed(() => String(route.params.scheduleId ?? ''))
const canWrite = computed(
  () =>
    hasPermission('exam-grading.grade') ||
    hasPermission('exam-grading.manage-all'),
)

const entry = useOfflineScoreEntry(scheduleId)
const {
  schedule,
  rows,
  loading,
  loadError,
  lastError,
  drafts,
  rowStates,
  counts,
  absentSentRows,
} = entry
void entry.load()

const importOpen = ref(false)
const downloading = ref(false)
const pasteSummary = ref('')

const title = computed(() =>
  schedule.value
    ? `${schedule.value.subjectName ?? '-'} · ${schedule.value.classroomName ?? '-'}`
    : 'Nilai Offline',
)

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Nilai Offline', href: OFFLINE_SCORES_PATH },
  { title: title.value, href: '#' },
])

const summary = computed(() => {
  const current = schedule.value
  if (current === null) return []
  return [
    { label: 'Mata Pelajaran', value: current.subjectName ?? '-' },
    { label: 'Kelas', value: current.classroomName ?? '-' },
    {
      label: 'Jenis',
      value: `Offline · ${offlineKindLabel(current.offlineKind)}`,
    },
    { label: 'Maksimum', value: String(current.maxScore) },
    { label: 'Dinilai', value: String(counts.value.scored) },
    { label: 'Tidak hadir', value: String(counts.value.absent) },
    { label: 'Belum dinilai', value: String(counts.value.missing) },
    { label: 'Terkirim', value: String(counts.value.sent) },
  ]
})

function focusNext(event: KeyboardEvent) {
  const current = event.target as HTMLElement
  const scope = current.closest('table, [data-slot="data-table-cards"]')
  if (scope === null) return
  const inputs = [
    ...scope.querySelectorAll<HTMLInputElement>(
      'input[data-score-input]:not(:disabled)',
    ),
  ]
  inputs[inputs.indexOf(current as HTMLInputElement) + 1]?.focus()
}

function onScoreKeydown(studentId: string, event: KeyboardEvent) {
  if (event.key !== 'Enter') return
  event.preventDefault()
  entry.commit(studentId)
  focusNext(event)
}

function onPaste(studentId: string, event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text/plain') ?? ''
  if (pastedLines(text).length <= 1) return
  event.preventDefault()
  pasteSummary.value = entry.paste(studentId, text)
}

const columns = computed(() =>
  buildOfflineEntryColumns({
    drafts,
    rowStates,
    canWrite: canWrite.value,
    onScore: entry.setScore,
    onNote: entry.setNote,
    onCommit: entry.commit,
    onScoreKeydown,
    onPaste,
  }),
)

async function download() {
  downloading.value = true
  await examOfflineService.downloadSheet(scheduleId.value)
  downloading.value = false
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex min-w-0 items-center gap-3">
          <BackButton
            label="Kembali ke Nilai Offline"
            @click="router.push(OFFLINE_SCORES_PATH)"
          />
          <CardTitle class="font-semibold">{{ title }}</CardTitle>
        </div>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <div
          v-if="loadError"
          class="space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-control">{{ loadError }}</p>
          <Button
            variant="outline"
            @click="entry.load()"
          >
            Coba lagi
          </Button>
        </div>
        <template v-else>
          <dl
            v-if="summary.length > 0"
            data-test="summary"
            class="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-4 py-2"
          >
            <div
              v-for="item in summary"
              :key="item.label"
              class="flex flex-col gap-0.5"
            >
              <dt class="text-control text-muted-foreground">
                {{ item.label }}
              </dt>
              <dd class="text-control font-medium">{{ item.value }}</dd>
            </div>
          </dl>

          <div
            v-if="absentSentRows.length > 0"
            data-test="sent-absent-warning"
            class="rounded-md border border-warning/30 bg-warning/10 px-4 py-2 text-control text-warning"
            role="alert"
          >
            <p>{{ SENT_BEFORE_ABSENT_WARNING }}:</p>
            <p class="font-medium">
              {{ absentSentRows.map((item) => item.name ?? '-').join(', ') }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <Button
              v-if="canWrite"
              variant="outline"
              :disabled="loading"
              @click="importOpen = true"
            >
              Impor nilai
            </Button>
            <Button
              variant="outline"
              :disabled="downloading"
              @click="download"
            >
              Unduh lembar nilai (.xlsx)
            </Button>
          </div>

          <p
            data-test="paste-summary"
            class="text-control text-muted-foreground empty:hidden"
            role="status"
          >
            {{ pasteSummary }}
          </p>
          <p
            class="sr-only"
            aria-live="assertive"
          >
            {{ lastError }}
          </p>

          <DataTable
            mobile="cards"
            :columns="columns"
            :data="rows"
            :is-loading="loading"
            item-label="siswa"
            hide-pagination
          >
            <template #empty>
              <DataTableEmpty message="Belum ada siswa di kelas ini." />
            </template>
          </DataTable>
        </template>
      </CardContent>
      <CardFooter plain />
    </Card>

    <ScoreImportDialog
      :open="importOpen"
      :schedule-id="scheduleId"
      @update:open="importOpen = $event"
      @imported="entry.reloadRoster()"
    />
  </div>
</template>
