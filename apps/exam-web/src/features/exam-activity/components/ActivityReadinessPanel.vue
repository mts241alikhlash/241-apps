<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { CircleCheck, RefreshCw, TriangleAlert } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import { examActivityApi } from '../api/examActivityApi'
import type { ActivityReadiness } from '../types'
import DeliveryBadge from './DeliveryBadge.vue'

const props = defineProps<{ eventId: string; date: string }>()

const CHECK_LABELS: Record<ActivityReadiness['checks'][number]['key'], string> =
  {
    PACKAGE: 'Paket soal',
    SCHEDULES: 'Jadwal kelas',
    SEATS: 'Kursi',
    NUMBERS: 'Nomor peserta',
    SUPERVISORS: 'Pengawas',
    TECHNICIANS: 'Teknisi',
    LATE_TOLERANCE: 'Toleransi terlambat',
  }

const rows = ref<ActivityReadiness[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
let requestId = 0

const clock = (iso: string): string =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))

const failing = (row: ActivityReadiness): number =>
  row.checks.filter((check) => !check.ok).length

async function load(): Promise<void> {
  const current = ++requestId
  loading.value = true
  error.value = null
  try {
    const result = await examActivityApi.readiness({
      ...(props.eventId !== '' ? { eventId: props.eventId } : {}),
      date: props.date,
    })
    if (current !== requestId) return
    rows.value = result
  } catch (err: unknown) {
    if (current !== requestId) return
    rows.value = []
    error.value = messageOf(err, 'Gagal memuat kesiapan.')
  } finally {
    if (current === requestId) loading.value = false
  }
}

watch(
  () => [props.eventId, props.date],
  () => void load(),
)
onMounted(load)
</script>

<template>
  <Card
    gap="none"
    class="shrink-0"
  >
    <CardHeader standard>
      <CardTitle size="md">Kesiapan Hari Ini</CardTitle>
      <Button
        variant="outline"
        class="shrink-0"
        :disabled="loading"
        @click="load"
      >
        <RefreshCw class="size-4" />
        Segarkan
      </Button>
    </CardHeader>
    <CardContent variant="standard">
      <p
        v-if="error !== null"
        role="alert"
        class="text-control text-destructive"
      >
        {{ error }}. Kesiapan belum bisa dipastikan, coba segarkan.
      </p>
      <p
        v-else-if="loading"
        class="text-control text-muted-foreground"
      >
        Memuat kesiapan…
      </p>
      <p
        v-else-if="rows.length === 0"
        class="text-control text-muted-foreground"
      >
        Tidak ada kegiatan pada hari ini.
      </p>
      <ul
        v-else
        class="grid gap-3"
      >
        <li
          v-for="row in rows"
          :key="row.activityId"
          :data-activity="row.activityId"
          class="rounded-md border p-3"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-medium">
              {{ row.subjectName ?? 'Kegiatan' }}
              {{ row.gradeName ?? '' }}
            </span>
            <span class="text-control text-muted-foreground">
              {{ clock(row.startsAt) }}
            </span>
            <DeliveryBadge
              :delivery-mode="row.deliveryMode"
              :offline-kind="null"
            />
            <span
              v-if="failing(row) > 0"
              class="text-control font-medium text-destructive"
            >
              {{ failing(row) }} pemeriksaan belum siap
            </span>
          </div>
          <ul class="mt-2 grid gap-1">
            <li
              v-for="check in row.checks"
              :key="check.key"
              :data-check="check.key"
              :data-ok="String(check.ok)"
              class="flex items-start gap-2 text-control"
            >
              <CircleCheck
                v-if="check.ok"
                class="mt-0.5 size-4 shrink-0 text-success"
                aria-hidden="true"
              />
              <TriangleAlert
                v-else
                class="mt-0.5 size-4 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <span>
                <span class="font-medium">
                  {{ CHECK_LABELS[check.key] }}
                </span>
                <span :class="check.ok ? '' : 'text-destructive'">
                  {{ check.ok ? 'Siap' : 'Belum siap' }}
                </span>
                <span class="text-muted-foreground">{{ check.detail }}</span>
              </span>
            </li>
          </ul>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
