<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BackButton, DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import {
  SessionRecoveryDialog,
  SessionTimelineDialog,
  SessionSnapshotGalleryDialog,
} from '@/features/exam-room'
import type { RecoveryAction } from '@/features/exam-room/types'
import { examScheduleService } from '../services/examScheduleService'
import type { ScheduleSession } from '../types'
import { buildSessionColumns } from '../components/sessionColumns'

const route = useRoute()
const router = useRouter()
const { hasPermission } = useAuthSession()

const scheduleId = computed(() => String(route.params.scheduleId ?? ''))
const title = computed(() =>
  typeof route.query.judul === 'string' && route.query.judul !== ''
    ? route.query.judul
    : 'Sesi Ujian',
)

const sessions = ref<ScheduleSession[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const timelineSession = ref<ScheduleSession | null>(null)
const recoverySession = ref<ScheduleSession | null>(null)
const recoveryAction = ref<RecoveryAction>('reopen')
const photoSession = ref<ScheduleSession | null>(null)

useBreadcrumbs(() => [
  { title: 'Jadwal Ujian', href: '/exam/schedules' },
  { title: title.value },
])

const canRelease = computed(() => hasPermission('exam-sessions.release'))
const canRecover = computed(
  () =>
    hasPermission('exam-rooms.technician') ||
    hasPermission('exam-rooms.manage-all'),
)
const canReadHistory = computed(
  () =>
    hasPermission('exam-rooms.supervise') ||
    hasPermission('exam-rooms.manage-all'),
)
const canViewPhotos = computed(
  () =>
    hasPermission('exam-rooms.supervise') ||
    hasPermission('exam-rooms.manage-all'),
)

const columns = computed(() =>
  buildSessionColumns({
    canRelease: canRelease.value,
    onRelease: (session) => {
      recoverySession.value = session
      recoveryAction.value = 'release'
    },
    canRecover: canRecover.value,
    onReset: (session) => {
      recoverySession.value = session
      recoveryAction.value = 'reset'
    },
    canReadHistory: canReadHistory.value,
    onHistory: (session) => {
      timelineSession.value = session
    },
    canViewPhotos: canViewPhotos.value,
    onPhotos: (session) => {
      photoSession.value = session
    },
  }),
)

async function load() {
  loading.value = true
  const result = await examScheduleService.loadSessions(scheduleId.value)
  loading.value = false
  if (result.success) {
    sessions.value = result.data
    error.value = null
  } else {
    sessions.value = []
    error.value = result.error
  }
}

watch(scheduleId, () => void load())
onMounted(load)
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card gap="none">
      <CardHeader standard>
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke Jadwal Ujian"
            @click="router.push('/exam/schedules')"
          />
          <CardTitle size="lg">{{ title }}</CardTitle>
        </div>
      </CardHeader>
      <CardContent variant="flush">
        <div
          v-if="error"
          class="m-4 space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-[length:var(--text-control,0.75rem)]">{{ error }}</p>
          <Button
            variant="outline"
            @click="load"
          >
            Coba lagi
          </Button>
        </div>
        <DataTable
          v-else
          mobile="cards"
          hide-pagination
          :columns="columns"
          :data="sessions"
          :is-loading="loading"
          item-label="sesi"
        >
          <template #empty>
            <p>Belum ada siswa yang memulai ujian ini.</p>
          </template>
        </DataTable>
      </CardContent>
    </Card>

    <SessionRecoveryDialog
      :open="recoverySession !== null"
      room-id=""
      :student-id="recoverySession?.studentId ?? null"
      :student-name="recoverySession?.studentName ?? null"
      :session-id="recoverySession?.sessionId ?? null"
      :action="recoveryAction"
      @update:open="(value: boolean) => value || (recoverySession = null)"
      @done="load()"
    />

    <SessionTimelineDialog
      :open="timelineSession !== null"
      :student-name="timelineSession?.studentName ?? null"
      :session-id="timelineSession?.sessionId ?? null"
      @update:open="(value: boolean) => value || (timelineSession = null)"
    />

    <SessionSnapshotGalleryDialog
      :open="photoSession !== null"
      :session-id="photoSession?.sessionId ?? null"
      :student-name="photoSession?.studentName ?? null"
      @update:open="(value: boolean) => value || (photoSession = null)"
    />
  </div>
</template>
