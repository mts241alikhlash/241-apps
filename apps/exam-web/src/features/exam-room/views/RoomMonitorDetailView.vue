<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BackButton, DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@mts241alikhlash/ui/tabs'
import { toast } from 'vue-sonner'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import RoomMonitorSummaryCards from '../components/RoomMonitorSummaryCards.vue'
import RoomReportTab from '../components/RoomReportTab.vue'
import RecordAbsenceDialog from '../components/RecordAbsenceDialog.vue'
import RecordFieldNoteDialog from '../components/RecordFieldNoteDialog.vue'
import SessionRecoveryDialog from '../components/SessionRecoveryDialog.vue'
import SessionTimelineDialog from '../components/SessionTimelineDialog.vue'
import { buildRoomParticipantColumns } from '../components/roomParticipantColumns'
import { useRoomMonitor } from '../composables/useRoomMonitor'
import { abilitiesFor, examRoomService } from '../services/examRoomService'
import type { RoomMonitorParticipant } from '../types'
import { MONITOR_STATUSES, monitorStatusLabel } from '../types'
import type { MonitorStatus, RecoveryAction } from '../types'

const route = useRoute()
const router = useRouter()
const { hasPermission, user } = useAuthSession()
const statusFieldId = useId()

const roomId = computed(() => String(route.params.roomId ?? ''))
const activeSlotId = ref('')
const slotId = computed(() =>
  typeof route.query.slot === 'string' && route.query.slot !== ''
    ? route.query.slot
    : activeSlotId.value,
)

const {
  participants,
  summary,
  page,
  pageSize,
  search,
  status,
  totalItems,
  loading,
  room,
  token,
  lastUpdatedServerTime,
  secondsSinceLastSuccess,
  nowMs,
  failed,
  error,
  staleness,
  refresh,
  start,
  stop,
} = useRoomMonitor({ roomId, slotId })
const abilities = computed(() => abilitiesFor(hasPermission))

const tab = ref('participants')

const timelineTarget = ref<RoomMonitorParticipant | null>(null)
const absenceTarget = ref<RoomMonitorParticipant | null>(null)
const fieldNoteTarget = ref<RoomMonitorParticipant | null>(null)
const recoveryTarget = ref<RoomMonitorParticipant | null>(null)
const recoveryAction = ref<RecoveryAction>('reopen')
const MAX_TOTAL_EXTRA_MINUTES = 180
const MS_PER_MINUTE = 60_000

const recoverySession = computed(() => recoveryTarget.value?.session ?? null)

const recoveryMaxExtendMinutes = computed(() => {
  const session = recoverySession.value
  if (session === null) return null
  const windowMinutes = Math.floor(
    (Date.parse(session.scheduleEndsAt) - Date.parse(session.deadline)) /
      MS_PER_MINUTE,
  )
  return Math.max(
    0,
    Math.min(windowMinutes, MAX_TOTAL_EXTRA_MINUTES - session.extraMinutes),
  )
})

const recoveryWindowOpen = computed(() => {
  const session = recoverySession.value
  if (session === null) return true
  const windowEnd = Math.max(
    Date.parse(session.scheduleEndsAt),
    Date.parse(session.deadline) + session.extraMinutes * MS_PER_MINUTE,
  )
  return Date.now() <= windowEnd
})

const title = computed(() => {
  const current = room.value
  return current === null ? 'Ruang Ujian' : `${current.code} · ${current.name}`
})

const roomSubtitle = computed(() => {
  const current = room.value
  if (current === null) return null
  return [
    current.currentSupervisorName
      ? `Pengawas ${current.currentSupervisorName}`
      : 'Pengawas belum ditugaskan',
    current.technicianName ? `Teknisi ${current.technicianName}` : null,
    current.isSubstituted ? 'Pengawas pengganti' : null,
  ]
    .filter(Boolean)
    .join(' · ')
})

const freshnessText = computed(() => {
  const seconds = secondsSinceLastSuccess.value
  const stamp = lastUpdatedServerTime.value
  if (staleness.value !== 'fresh') {
    return `Koneksi terputus: data terakhir ${seconds} detik lalu`
  }
  const clock =
    stamp === null
      ? ''
      : ` • ${new Date(stamp).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}`
  return `Diperbarui ${seconds} detik lalu${clock} (Otomatis tiap 5 dtk)`
})

const freshnessVariant = computed(() =>
  staleness.value === 'fresh'
    ? 'outline'
    : staleness.value === 'warning'
      ? 'secondary'
      : 'destructive',
)

const tokenMinutes = computed(() => {
  const current = token.value
  if (current === null) return null
  const left = new Date(current.expiresAt).getTime() - nowMs.value
  return Math.max(0, Math.ceil(left / 60000))
})

useBreadcrumbs(() => [
  { title: 'Ruang Ujian', href: '/exam/rooms' },
  { title: title.value },
])

const columns = computed(() =>
  buildRoomParticipantColumns({
    ...abilities.value,
    onTimeline: (row) => {
      timelineTarget.value = row
    },
    onAbsence: (row) => {
      absenceTarget.value = row
    },
    onFieldNote: (row) => {
      fieldNoteTarget.value = row
    },
    onRelease: (row) => {
      recoveryTarget.value = row
      recoveryAction.value = 'release'
    },
    onReopen: (row) => {
      recoveryTarget.value = row
      recoveryAction.value = 'reopen'
    },
    onReset: (row) => {
      recoveryTarget.value = row
      recoveryAction.value = 'reset'
    },
    onExtendTime: (row) => {
      recoveryTarget.value = row
      recoveryAction.value = 'extend-time'
    },
    onAllowLate: (row) => {
      recoveryTarget.value = row
      recoveryAction.value = 'allow-late'
    },
  }),
)

function printRoute(kind: 'kartu' | 'meja') {
  void router.push({
    path: `/exam/rooms/${roomId.value}/${kind}`,
    query: slotId.value === '' ? {} : { slot: slotId.value },
  })
}

async function copyToken() {
  const current = token.value
  if (current === null) return
  try {
    await navigator.clipboard.writeText(current.accessCode)
    toast.success('Token ruangan disalin.')
  } catch {
    toast.error('Token tidak dapat disalin.')
  }
}

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

const noSlotAssigned = ref(false)

async function loadActiveSlot() {
  const slots = await examRoomService.loadSupervisors(roomId.value)
  const now = Date.now()
  const current = slots.find(
    (slot) =>
      new Date(slot.startsAt).getTime() <= now &&
      new Date(slot.endsAt).getTime() > now,
  )
  const mine = slots.filter(
    (slot) =>
      slot.actualUserId === user.value?.id ||
      slot.scheduledUserId === user.value?.id,
  )
  const mineNow = mine.find((slot) => slot.slotId === current?.slotId)
  const next = mine.find((slot) => new Date(slot.startsAt).getTime() > now)
  const past = mine
    .filter((slot) => new Date(slot.endsAt).getTime() <= now)
    .sort(
      (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
    )[0]
  const fallback = abilities.value.recover ? (current ?? slots[0]) : undefined
  activeSlotId.value =
    mineNow?.slotId ?? next?.slotId ?? past?.slotId ?? fallback?.slotId ?? ''
  noSlotAssigned.value = activeSlotId.value === ''
}

onMounted(async () => {
  start()
  await loadActiveSlot()
})
onUnmounted(() => {
  stop()
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader variant="muted">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <BackButton
              label="Kembali ke Ruang Ujian"
              @click="router.push('/exam/rooms')"
            />
            <div class="flex flex-col">
              <CardTitle class="font-semibold">{{ title }}</CardTitle>
              <span
                v-if="roomSubtitle"
                class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
              >
                {{ roomSubtitle }}
              </span>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Badge
              v-if="token"
              variant="outline"
              class="tabular-nums"
            >
              Token {{ token.accessCode }} · {{ tokenMinutes }} mnt
            </Badge>
            <Button
              v-if="token"
              variant="outline"
              @click="copyToken"
            >
              Salin Token
            </Button>
            <Button
              variant="outline"
              @click="printRoute('kartu')"
            >
              Kartu Peserta
            </Button>
            <Button
              variant="outline"
              @click="printRoute('meja')"
            >
              Daftar Meja
            </Button>
            <Badge
              :variant="freshnessVariant"
              class="tabular-nums"
            >
              {{ freshnessText }}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6 space-y-4"
      >
        <RoomMonitorSummaryCards :summary="summary" />

        <Tabs
          v-model="tab"
          variant="line"
        >
          <TabsList>
            <TabsTrigger value="participants"
              >Peserta &amp; Progres</TabsTrigger
            >
            <TabsTrigger value="report">Berita Acara</TabsTrigger>
          </TabsList>

          <TabsContent value="participants">
            <p
              v-if="noSlotAssigned"
              class="mb-4 text-[length:var(--text-control,0.75rem)] text-muted-foreground"
            >
              Anda tidak bertugas pada jam ini.
            </p>
            <div
              v-if="failed && error"
              class="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive"
              role="alert"
            >
              {{ error }}
            </div>
            <DataTable
              mobile="cards"
              :columns="columns"
              :data="participants"
              :page="page"
              :page-size="pageSize"
              :total-items="totalItems"
              :is-loading="loading && participants.length === 0"
              item-label="peserta"
              @update:page="page = $event"
              @update:page-size="changePageSize"
            >
              <template #header-right>
                <FloatingLabelField
                  label="Status"
                  :for="statusFieldId"
                  class="w-fit min-w-32"
                  floating
                >
                  <Select v-model="status">
                    <SelectTrigger
                      :id="statusFieldId"
                      class="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="option in MONITOR_STATUSES"
                        :key="option"
                        :value="option"
                      >
                        {{ monitorStatusLabel(option as MonitorStatus) }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FloatingLabelField>
                <SearchInput
                  v-model="search"
                  label="Cari nama atau NIS"
                  placeholder="Cari nama atau NIS"
                />
              </template>
              <template #empty>
                <p>Tidak ada peserta yang cocok dengan filter.</p>
              </template>
            </DataTable>
          </TabsContent>

          <TabsContent value="report">
            <RoomReportTab
              :room-id="roomId"
              :slot-id="slotId"
              :can-verify="hasPermission('exam-rooms.manage-all')"
              :can-submit="abilities.supervise"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter variant="thin" />
    </Card>

    <SessionTimelineDialog
      :open="timelineTarget !== null"
      :student-name="timelineTarget?.studentName ?? null"
      :session-id="timelineTarget?.session?.sessionId ?? null"
      @update:open="(value: boolean) => value || (timelineTarget = null)"
    />

    <RecordAbsenceDialog
      :open="absenceTarget !== null"
      :room-id="roomId"
      :slot-id="slotId"
      :participant="absenceTarget"
      @update:open="(value: boolean) => value || (absenceTarget = null)"
      @saved="refresh()"
    />

    <RecordFieldNoteDialog
      :open="fieldNoteTarget !== null"
      :room-id="roomId"
      :slot-id="slotId"
      :participant="fieldNoteTarget"
      @update:open="(value: boolean) => value || (fieldNoteTarget = null)"
      @saved="refresh()"
    />

    <SessionRecoveryDialog
      :open="recoveryTarget !== null"
      :room-id="roomId"
      :student-id="recoveryTarget?.studentId ?? null"
      :student-name="recoveryTarget?.studentName ?? null"
      :session-id="recoveryTarget?.session?.sessionId ?? null"
      :action="recoveryAction"
      :max-extend-minutes="recoveryMaxExtendMinutes"
      :window-open="recoveryWindowOpen"
      @update:open="(value: boolean) => value || (recoveryTarget = null)"
      @done="refresh()"
    />
  </div>
</template>
