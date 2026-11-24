<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRouteCategory } from '@/features/exam-shared/useRouteCategory'
import { BackButton, DataTable, DataTableEmpty } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@mts241alikhlash/ui/card'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import GradeItemDialog from '../components/GradeItemDialog.vue'
import { buildGradingItemColumns } from '../components/gradingItemColumns'
import { examGradingService } from '../services/examGradingService'
import { formatScore } from '../types'
import type { GradingDetail, GradingItem } from '../types'

const route = useRoute()
const router = useRouter()
const sessionId = computed(() => String(route.params.sessionId ?? ''))
const scheduleId = computed(() => String(route.params.scheduleId ?? ''))

const { hasPermission } = useAuthSession()
const { sectionPrefix } = useRouteCategory()
const gradingBaseHref = computed(() => `${sectionPrefix.value}/grading`)
const examTitle = computed(() =>
  typeof route.query.judul === 'string' && route.query.judul !== ''
    ? route.query.judul
    : 'Daftar Siswa',
)
const sessionsLocation = computed(() => ({
  path: `${gradingBaseHref.value}/${scheduleId.value}`,
  query: route.query,
}))
const detail = ref<GradingDetail | null>(null)
let request = 0
const loading = ref(true)
const error = ref<string | null>(null)

const studentLabel = computed(
  () => detail.value?.session.studentName ?? 'Siswa',
)
const finished = computed(() => detail.value?.session.status !== 'IN_PROGRESS')
const canGrade = computed(
  () => hasPermission('exam-grading.grade') && finished.value,
)
const waiting = computed(
  () => detail.value?.items.filter((item) => item.needsGrading).length ?? 0,
)

useBreadcrumbs(() => [
  { title: 'Penilaian Ujian', href: gradingBaseHref.value },
  {
    title: examTitle.value,
    href: router.resolve(sessionsLocation.value).href,
  },
  { title: studentLabel.value },
])

async function load() {
  const current = ++request
  loading.value = true
  const result = await examGradingService.loadSession(sessionId.value)
  if (current !== request) return
  loading.value = false
  if (result.success) {
    detail.value = result.data
    error.value = null
  } else {
    detail.value = null
    error.value = result.error
  }
}

async function onGraded(item: GradingItem) {
  if (!detail.value) return
  detail.value = {
    ...detail.value,
    items: detail.value.items.map((row) =>
      row.questionId === item.questionId ? item : row,
    ),
  }
  const current = ++request
  const result = await examGradingService.loadSession(sessionId.value)
  if (current === request && result.success) detail.value = result.data
}

const filter = ref('ALL')
const filterFieldId = useId()
const openId = ref<string | null>(null)

const shown = computed(() => {
  const items = detail.value?.items ?? []
  const rows =
    filter.value === 'WAITING'
      ? items.filter((item) => item.needsGrading)
      : items
  return [...rows].sort((left, right) => left.number - right.number)
})
const opened = computed(
  () =>
    detail.value?.items.find((item) => item.questionId === openId.value) ??
    null,
)
const columns = computed(() =>
  buildGradingItemColumns({
    sessionId: sessionId.value,
    canGrade: canGrade.value,
    onOpen: (item) => {
      openId.value = item.questionId
    },
    onGraded: (item) => {
      void onGraded(item)
    },
  }),
)

watch(sessionId, load)
onMounted(load)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke Daftar Siswa"
            @click="router.push(sessionsLocation)"
          />
          <CardTitle class="font-semibold">{{ studentLabel }}</CardTitle>
        </div>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto space-y-4 pt-2 px-4 pb-4"
      >
        <p v-if="loading">Memuat…</p>
        <div
          v-else-if="error"
          class="space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p>{{ error }}</p>
          <Button
            variant="outline"
            @click="load"
          >
            Coba lagi
          </Button>
        </div>
        <template v-else-if="detail">
          <p v-if="detail.items.length === 0">Ujian ini tidak punya soal.</p>
          <p
            v-if="!finished"
            class="shrink-0 rounded-md border p-3"
          >
            Siswa ini masih mengerjakan. Jawaban bisa dinilai setelah ujian
            selesai.
          </p>
          <p
            v-else-if="!hasPermission('exam-grading.grade')"
            class="shrink-0 rounded-md border p-3"
          >
            Anda hanya bisa melihat jawaban; menilai butuh izin penilaian.
          </p>
          <dl
            v-if="detail.items.length > 0"
            class="flex shrink-0 flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-4 py-2"
          >
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">Nilai</dt>
              <dd class="font-medium">
                {{
                  detail.session.rawScore !== null
                    ? `${formatScore(detail.session.rawScore)} / ${formatScore(detail.session.maxScore ?? 0)}`
                    : '-'
                }}
              </dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">Jumlah Soal</dt>
              <dd class="font-medium">{{ detail.items.length }}</dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">Belum Dinilai</dt>
              <dd :class="['font-medium', waiting > 0 && 'text-destructive']">
                {{ waiting }}
              </dd>
            </div>
          </dl>
          <DataTable
            v-if="detail.items.length > 0"
            mobile="cards"
            hide-pagination
            hide-per-page
            :columns="columns"
            :data="shown"
            :page-size="1000"
            :total-items="shown.length"
            item-label="soal"
            @row-click="(item) => (openId = item.questionId)"
          >
            <template #filters>
              <FloatingLabelField
                label="Tampilkan"
                :for="filterFieldId"
                class="w-fit min-w-36"
                floating
              >
                <Select v-model="filter">
                  <SelectTrigger
                    :id="filterFieldId"
                    class="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua soal</SelectItem>
                    <SelectItem value="WAITING">Perlu dinilai</SelectItem>
                  </SelectContent>
                </Select>
              </FloatingLabelField>
            </template>
            <template #empty>
              <DataTableEmpty message="Tidak ada soal yang perlu dinilai." />
            </template>
          </DataTable>
        </template>
      </CardContent>
      <CardFooter plain />
    </Card>

    <GradeItemDialog
      :open="opened !== null"
      :session-id="detail?.session.sessionId ?? sessionId"
      :item="opened"
      :can-grade="canGrade"
      @update:open="(value: boolean) => value || (openId = null)"
      @graded="onGraded"
    />
  </div>
</template>
