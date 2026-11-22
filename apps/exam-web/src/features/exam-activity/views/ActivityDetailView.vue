<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRouteCategory } from '@/features/exam-shared/useRouteCategory'
import { toast } from 'vue-sonner'
import { SquarePen } from '@lucide/vue'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { BackButton, DataTable, DataTableEmpty } from '@mts241alikhlash/ui'
import type { ColumnDef } from '@tanstack/vue-table'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@mts241alikhlash/ui/card'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import { examTypeLabel } from '@/features/exam-shared/examType'
import {
  classOfClassroom,
  gradeOfClassroom,
} from '@/features/exam-shared/classroomName'
import ActivityPolicyDialog from '../components/ActivityPolicyDialog.vue'
import { examActivityApi } from '../api/examActivityApi'
import {
  activityStatusLabel,
  type ExamActivityDetail,
  type ExamPolicy,
} from '../types'

const route = useRoute()
const router = useRouter()
const { hasPermission } = useAuthSession()

const activityId = computed(() => String(route.params.id ?? ''))
const { sectionPrefix } = useRouteCategory()
const canManageAll = computed(() => hasPermission('exam-schedules.manage-all'))

const detail = ref<ExamActivityDetail | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const policyOpen = ref(false)

type ScheduleRow = ExamActivityDetail['schedules'][number]

const dateOf = (iso: string): string =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'long',
  }).format(new Date(iso))

const clock = (iso: string): string =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))

const scheduleColumns: ColumnDef<ScheduleRow>[] = [
  {
    id: 'grade',
    header: 'Tingkat',
    meta: {
      align: 'center',
      mobileLabel: 'Tingkat',
      mobileValue: (row: ScheduleRow) => gradeOfClassroom(row.classroomName),
    },
    cell: ({ row }) => gradeOfClassroom(row.original.classroomName),
  },
  {
    id: 'classroom',
    header: 'Kelas',
    meta: {
      align: 'center',
      mobile: 'title',
      mobileValue: (row: ScheduleRow) => classOfClassroom(row.classroomName),
    },
    cell: ({ row }) => classOfClassroom(row.original.classroomName),
  },
  {
    id: 'date',
    header: 'Tanggal',
    meta: {
      align: 'center',
      mobileLabel: 'Tanggal',
      mobileValue: (row: ScheduleRow) => dateOf(row.startsAt),
    },
    cell: ({ row }) => dateOf(row.original.startsAt),
  },
  {
    id: 'start',
    header: 'Jam Mulai',
    meta: {
      align: 'center',
      mobileLabel: 'Jam Mulai',
      mobileValue: (row: ScheduleRow) => clock(row.startsAt),
    },
    cell: ({ row }) => clock(row.original.startsAt),
  },
  {
    id: 'end',
    header: 'Jam Selesai',
    meta: {
      align: 'center',
      mobileLabel: 'Jam Selesai',
      mobileValue: (row: ScheduleRow) => clock(row.endsAt),
    },
    cell: ({ row }) => clock(row.original.endsAt),
  },
]

const sortedSchedules = computed<ScheduleRow[]>(() =>
  [...(detail.value?.schedules ?? [])].sort((left, right) => {
    const grade = (name: string | null): number =>
      Number(/(\d+)/.exec(name ?? '')?.[1] ?? Number.MAX_SAFE_INTEGER)
    return (
      grade(left.classroomName) - grade(right.classroomName) ||
      (left.classroomName ?? '').localeCompare(
        right.classroomName ?? '',
        'id',
        {
          numeric: true,
        },
      )
    )
  }),
)

async function load(): Promise<void> {
  if (!activityId.value) return
  loading.value = true
  error.value = null
  try {
    const response = await examActivityApi.get(activityId.value)
    detail.value = response
  } catch (err: unknown) {
    error.value = messageOf(err, 'Gagal memuat detail kegiatan.')
  } finally {
    loading.value = false
  }
}

function onPolicySaved(nextPolicy: ExamPolicy): void {
  if (!detail.value) return
  detail.value = {
    ...detail.value,
    policy: nextPolicy,
  }
  toast.success('Kebijakan kegiatan disimpan.')
}

watch(activityId, () => void load())
onMounted(load)
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
            label="Kembali ke Kegiatan"
            @click="router.push(`${sectionPrefix}/activities`)"
          />
          <CardTitle class="font-semibold">
            {{ detail?.subjectName ?? 'Detail Kegiatan' }}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <div
          v-if="error !== null"
          role="alert"
          class="space-y-3 rounded-md border p-4"
        >
          <p class="text-control">{{ error }}</p>
          <Button
            variant="outline"
            @click="load"
          >
            Coba lagi
          </Button>
        </div>

        <p
          v-else-if="loading"
          class="text-control text-muted-foreground"
        >
          Memuat detail kegiatan…
        </p>

        <template v-else-if="detail">
          <dl
            class="flex shrink-0 flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-4 py-2"
          >
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">Jenis</dt>
              <dd class="font-medium">
                {{ detail.type ? examTypeLabel(detail.type) : '-' }}
              </dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">Tingkat</dt>
              <dd class="font-medium">{{ detail.gradeName ?? '-' }}</dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">Status</dt>
              <dd class="font-medium">
                {{ activityStatusLabel(detail.status) }}
              </dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">Tanggal Mulai</dt>
              <dd class="font-medium">{{ dateOf(detail.startsAt) }}</dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">
                Tanggal Selesai
              </dt>
              <dd class="font-medium">{{ dateOf(detail.endsAt) }}</dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">Jam</dt>
              <dd class="font-medium">
                {{ clock(detail.startsAt) }} - {{ clock(detail.endsAt) }}
              </dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">Durasi</dt>
              <dd class="font-medium">{{ detail.durationMinutes }} menit</dd>
            </div>
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">Token</dt>
              <dd class="font-medium">
                {{ detail.tokenMode === 'ROTATING' ? 'Berputar' : 'Tetap' }}
              </dd>
            </div>
          </dl>

          <Card
            gap="none"
            class="shrink-0"
          >
            <CardHeader standard>
              <CardTitle size="md">Kebijakan</CardTitle>
              <Button
                v-if="canManageAll"
                class="shrink-0"
                @click="policyOpen = true"
              >
                <SquarePen class="size-4" />
                Ubah
              </Button>
            </CardHeader>
            <CardContent variant="standard">
              <div class="grid gap-4 sm:grid-cols-3">
                <div>
                  <p class="mb-2 text-control font-medium">Pengawasan</p>
                  <dl class="grid gap-y-2">
                    <div class="flex flex-col gap-0.5">
                      <dt class="text-control text-muted-foreground">
                        Batas pelanggaran
                      </dt>
                      <dd class="font-medium">
                        {{ detail.policy.violationLimit }}
                      </dd>
                    </div>
                    <div class="flex flex-col gap-0.5">
                      <dt class="text-control text-muted-foreground">
                        Ambang hilang fokus
                      </dt>
                      <dd class="font-medium">
                        {{ detail.policy.focusThresholdMs }} ms
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <p class="mb-2 text-control font-medium">Waktu</p>
                  <dl class="grid gap-y-2">
                    <div class="flex flex-col gap-0.5">
                      <dt class="text-control text-muted-foreground">
                        Toleransi terlambat
                      </dt>
                      <dd class="font-medium">
                        {{ detail.policy.lateToleranceMinutes }} menit
                      </dd>
                    </div>
                    <div class="flex flex-col gap-0.5">
                      <dt class="text-control text-muted-foreground">
                        Minimal sebelum kumpul
                      </dt>
                      <dd class="font-medium">
                        {{ detail.policy.minSubmitMinutes }} menit
                      </dd>
                    </div>
                    <div class="flex flex-col gap-0.5">
                      <dt class="text-control text-muted-foreground">
                        Slot token berputar
                      </dt>
                      <dd class="font-medium">
                        {{ detail.policy.tokenSlotSeconds }} detik
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <p class="mb-2 text-control font-medium">Soal</p>
                  <dl class="grid gap-y-2">
                    <div class="flex flex-col gap-0.5">
                      <dt class="text-control text-muted-foreground">
                        Acak urutan soal
                      </dt>
                      <dd class="font-medium">
                        {{ detail.policy.shuffleQuestions ? 'Ya' : 'Tidak' }}
                      </dd>
                    </div>
                    <div class="flex flex-col gap-0.5">
                      <dt class="text-control text-muted-foreground">
                        Acak urutan pilihan
                      </dt>
                      <dd class="font-medium">
                        {{ detail.policy.shuffleChoices ? 'Ya' : 'Tidak' }}
                      </dd>
                    </div>
                    <div class="flex flex-col gap-0.5">
                      <dt class="text-control text-muted-foreground">
                        Izinkan lewat web (SEB)
                      </dt>
                      <dd class="font-medium">
                        {{ detail.policy.allowWeb ? 'Ya' : 'Tidak' }}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            gap="none"
            class="shrink-0"
          >
            <CardHeader standard>
              <CardTitle size="md">Jadwal per Kelas</CardTitle>
            </CardHeader>
            <CardContent variant="standard">
              <DataTable
                mobile="cards"
                hide-pagination
                hide-per-page
                :columns="scheduleColumns"
                :data="sortedSchedules"
                :page-size="1000"
                :total-items="sortedSchedules.length"
                item-label="kelas"
              >
                <template #empty>
                  <DataTableEmpty
                    message="Belum ada jadwal kelas pada kegiatan ini."
                  />
                </template>
              </DataTable>
            </CardContent>
          </Card>
        </template>
      </CardContent>
      <CardFooter plain />
    </Card>

    <ActivityPolicyDialog
      v-if="detail && policyOpen"
      v-model:open="policyOpen"
      :activity-id="detail.id"
      :policy="detail.policy"
      @saved="onPolicySaved"
    />
  </div>
</template>
