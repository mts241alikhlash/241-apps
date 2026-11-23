<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Filter } from '@lucide/vue'
import {
  BackButton,
  DataTable,
  SearchInput,
  DataTableEmpty,
} from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { toast } from 'vue-sonner'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import RoomActionQueue from '../components/RoomActionQueue.vue'
import RoomInfoCard from '../components/RoomInfoCard.vue'
import RoomNotesCard from '../components/RoomNotesCard.vue'
import RoomMonitorSummaryCards from '../components/RoomMonitorSummaryCards.vue'
import RoomSessionCard from '../components/RoomSessionCard.vue'
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

const MONITOR_ALL = 100

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
  pageSize,
  search,
  status,
  totalItems,
  loading,
  room,
  token,
  examWindow,
  secondsSinceLastSuccess,
  nowMs,
  failed,
  error,
  staleness,
  refresh,
  start,
  stop,
} = useRoomMonitor({ roomId, slotId })
pageSize.value = MONITOR_ALL
const abilities = computed(() => abilitiesFor(hasPermission))

const notePicker = ref(false)
const filterOpen = ref(false)
const mobileStatusFieldId = useId()
const noteRefresh = ref(0)
const activeSlot = ref<{ startsAt: string; endsAt: string } | null>(null)

function changed() {
  void refresh()
  noteRefresh.value += 1
}

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

const tokenMinutes = computed(() => {
  const current = token.value
  if (current === null) return null
  const left = new Date(current.expiresAt).getTime() - nowMs.value
  return Math.max(0, Math.ceil(left / 60000))
})

useBreadcrumbs(() => [
  { title: 'Monitoring', href: '/exam/rooms' },
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
  const byStart = [...slots].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  )
  const upcoming = byStart.find(
    (slot) => new Date(slot.startsAt).getTime() > now,
  )
  const latest = byStart
    .filter((slot) => new Date(slot.endsAt).getTime() <= now)
    .at(-1)
  const overview = abilities.value.recover
    ? (current ?? upcoming ?? latest ?? slots[0])
    : undefined
  activeSlotId.value =
    overview?.slotId ?? mineNow?.slotId ?? next?.slotId ?? past?.slotId ?? ''
  activeSlot.value =
    slots.find((slot) => slot.slotId === activeSlotId.value) ?? null
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
      <CardHeader standard>
        <div class="flex min-w-0 items-center gap-3">
          <BackButton
            label="Kembali ke Monitoring"
            @click="router.push('/exam/rooms')"
          />
          <CardTitle class="truncate font-semibold">{{
            room?.name ?? 'Ruang Ujian'
          }}</CardTitle>
        </div>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto p-4"
      >
        <Alert
          v-if="failed && error"
          variant="destructive"
          role="alert"
        >
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>

        <div class="grid gap-4 md:grid-cols-2">
          <RoomInfoCard
            class="md:col-span-2"
            :room="room"
            :subject="participants[0]?.subjectName ?? null"
            :registered="summary?.totalRegistered ?? null"
          />
          <RoomMonitorSummaryCards :summary="summary" />
          <RoomSessionCard
            :token="token"
            :minutes-left="tokenMinutes"
            :starts-at="examWindow?.startsAt ?? activeSlot?.startsAt ?? null"
            :ends-at="examWindow?.endsAt ?? activeSlot?.endsAt ?? null"
            :now-ms="nowMs"
            :staleness="staleness"
            :seconds-since="secondsSinceLastSuccess"
            @copy="copyToken"
          />
        </div>

        <div class="grid gap-4">
          <RoomActionQueue
            :participants="participants"
            :can-recover="abilities.recover"
            @reopen="
              (row) => {
                recoveryTarget = row
                recoveryAction = 'reopen'
              }
            "
            @release="
              (row) => {
                recoveryTarget = row
                recoveryAction = 'release'
              }
            "
            @timeline="(row) => (timelineTarget = row)"
          />

          <RoomNotesCard
            :room-id="roomId"
            :slot-id="slotId"
            :participants="participants"
            :can-add="abilities.supervise || abilities.recover"
            :refresh-key="noteRefresh"
            @add="notePicker = true"
          />

          <Card gap="none">
            <CardHeader standard>
              <CardTitle size="md">Peserta</CardTitle>
            </CardHeader>
            <CardContent variant="standard">
              <p
                v-if="noSlotAssigned"
                class="mb-4 text-control text-muted-foreground"
              >
                Anda tidak bertugas pada jam ini.
              </p>
              <DataTable
                mobile="cards"
                :columns="columns"
                :data="participants"
                :page-size="MONITOR_ALL"
                :total-items="totalItems"
                hide-pagination
                hide-per-page
                :is-loading="loading && participants.length === 0"
                item-label="peserta"
              >
                <template #filters>
                  <FloatingLabelField
                    label="Status"
                    :for="statusFieldId"
                    class="w-fit min-w-28"
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
                </template>
                <template #header-right>
                  <SearchInput
                    v-model="search"
                    class="sm:w-40"
                    label="Cari nama atau NIS"
                  />
                </template>
                <template #mobile-toolbar>
                  <SearchInput
                    v-model="search"
                    label="Cari nama atau NIS"
                    class="w-full"
                  />
                </template>
                <template #mobile-filter>
                  <Button
                    variant="outline"
                    class="relative shrink-0"
                    @click="filterOpen = true"
                  >
                    <Filter class="size-4" />
                    Filter
                    <span
                      v-if="status !== 'ALL'"
                      class="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
                    >
                      1
                    </span>
                  </Button>
                </template>
                <template #empty>
                  <DataTableEmpty
                    message="Tidak ada peserta yang cocok dengan filter."
                  />
                </template>
              </DataTable>
            </CardContent>
          </Card>
        </div>
      </CardContent>
      <CardFooter plain />
    </Card>

    <Dialog v-model:open="filterOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Filter Peserta</DialogTitle>
          <DialogDescription
            >Filter peserta berdasarkan status</DialogDescription
          >
        </DialogHeader>
        <DialogBody class="space-y-4">
          <FloatingLabelField
            label="Status"
            :for="mobileStatusFieldId"
            floating
          >
            <Select v-model="status">
              <SelectTrigger
                :id="mobileStatusFieldId"
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
        </DialogBody>
        <DialogFooter standard>
          <Button
            variant="outline"
            :disabled="status === 'ALL'"
            @click="status = 'ALL'"
          >
            Atur Ulang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
      @saved="changed()"
    />

    <RecordFieldNoteDialog
      :open="fieldNoteTarget !== null || notePicker"
      :room-id="roomId"
      :slot-id="slotId"
      :participant="fieldNoteTarget"
      :participants="participants"
      @update:open="
        (value: boolean) => {
          if (value) return
          fieldNoteTarget = null
          notePicker = false
        }
      "
      @saved="changed()"
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
      @done="changed()"
    />
  </div>
</template>
