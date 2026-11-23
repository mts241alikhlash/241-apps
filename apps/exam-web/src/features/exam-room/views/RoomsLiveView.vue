<script setup lang="ts">
import { computed, h, onMounted, ref, useId } from 'vue'
import { useRouter } from 'vue-router'
import type { ColumnDef } from '@tanstack/vue-table'
import { Copy, ExternalLink, Filter, Plus, RefreshCw } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { DataTable, DataTableEmpty, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import { Progress } from '@mts241alikhlash/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import RecordAbsenceDialog from '../components/RecordAbsenceDialog.vue'
import RecordFieldNoteDialog from '../components/RecordFieldNoteDialog.vue'
import RoomActionQueue from '../components/RoomActionQueue.vue'
import SessionRecoveryDialog from '../components/SessionRecoveryDialog.vue'
import SessionTimelineDialog from '../components/SessionTimelineDialog.vue'
import { attentionOf } from '../components/roomAttention'
import { buildRoomParticipantColumns } from '../components/roomParticipantColumns'
import {
  useAllRoomsMonitor,
  type LiveNote,
  type LiveRoom,
} from '../composables/useAllRoomsMonitor'
import { abilitiesFor } from '../services/examRoomService'
import type { RecoveryAction, RoomMonitorParticipant } from '../types'

const MAX_TOTAL_EXTRA_MINUTES = 180
const MS_PER_MINUTE = 60_000

const router = useRouter()
const { hasPermission } = useAuthSession()
const abilities = computed(() => abilitiesFor(hasPermission))
const {
  rooms,
  notes,
  slotByRoom,
  refreshNotes,
  loading,
  error,
  lastUpdatedAt,
  nowMs,
  totals,
  start,
  refresh,
} = useAllRoomsMonitor()

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Monitoring Semua Ruang', href: '/exam/monitoring' },
])

onMounted(start)

const clock = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})
const shortClock = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const updatedText = computed(() =>
  lastUpdatedAt.value === null ? '-' : clock.format(lastUpdatedAt.value),
)

function subjectOf(live: LiveRoom): string {
  const counts = new Map<string, number>()
  for (const row of live.participants) {
    if (row.subjectName === null || row.subjectName === '') continue
    counts.set(row.subjectName, (counts.get(row.subjectName) ?? 0) + 1)
  }
  const top = [...counts].sort((left, right) => right[1] - left[1])[0]
  return top === undefined ? '-' : top[0]
}

function remainingOf(live: LiveRoom): string {
  const window = live.meta?.window
  if (window === null || window === undefined) return '-'
  const end = Date.parse(window.endsAt)
  const begin = Date.parse(window.startsAt)
  if (nowMs.value < begin) return 'Belum dimulai'
  const left = Math.floor((end - nowMs.value) / 1000)
  if (left <= 0) return 'Selesai'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`
}

function windowOf(live: LiveRoom): string {
  const window = live.meta?.window
  if (window === null || window === undefined) return '-'
  return `${shortClock.format(Date.parse(window.startsAt))} - ${shortClock.format(Date.parse(window.endsAt))}`
}

const allParticipants = computed(() =>
  rooms.value.flatMap((live) => live.participants),
)

const roomByStudent = computed(() => {
  const map = new Map<string, LiveRoom['room']>()
  for (const live of rooms.value) {
    for (const row of live.participants) map.set(row.studentId, live.room)
  }
  return map
})

const roomNameOf = (row: RoomMonitorParticipant): string =>
  roomByStudent.value.get(row.studentId)?.name ?? '-'

const ALL = 'ALL'
const roomFilter = ref(ALL)
const gradeFilter = ref(ALL)
const classFilter = ref(ALL)
const search = ref('')
const filterOpen = ref(false)
const filterId = useId()

const gradeOfClass = (name: string | null): string =>
  name === null ? '' : (name.split('-')[0] ?? '')

const gradeOptions = computed(() =>
  [
    ...new Set(
      allParticipants.value.map((row) => gradeOfClass(row.classroomName)),
    ),
  ]
    .filter((grade) => grade !== '')
    .sort(
      (left, right) => left.length - right.length || left.localeCompare(right),
    ),
)

const classOptions = computed(() =>
  [
    ...new Set(
      allParticipants.value
        .filter(
          (row) =>
            gradeFilter.value === ALL ||
            gradeOfClass(row.classroomName) === gradeFilter.value,
        )
        .map((row) => row.classroomName ?? ''),
    ),
  ]
    .filter((name) => name !== '')
    .sort((left, right) => left.localeCompare(right)),
)

function setGrade(value: string) {
  gradeFilter.value = value
  if (
    classFilter.value !== ALL &&
    gradeOfClass(classFilter.value) !== value &&
    value !== ALL
  ) {
    classFilter.value = ALL
  }
}

const filterFields = computed(() => [
  {
    key: 'room',
    label: 'Ruang',
    value: roomFilter.value,
    set: (value: string) => (roomFilter.value = value),
    options: rooms.value.map((live) => ({
      value: live.room.id,
      label: live.room.name,
    })),
  },
  {
    key: 'grade',
    label: 'Tingkat',
    value: gradeFilter.value,
    set: setGrade,
    options: gradeOptions.value.map((grade) => ({
      value: grade,
      label: grade,
    })),
  },
  {
    key: 'class',
    label: 'Kelas',
    value: classFilter.value,
    set: (value: string) => (classFilter.value = value),
    options: classOptions.value.map((name) => ({ value: name, label: name })),
  },
])

const activeFilters = computed(
  () =>
    [roomFilter.value, gradeFilter.value, classFilter.value].filter(
      (value) => value !== ALL,
    ).length,
)

function resetFilters() {
  roomFilter.value = ALL
  gradeFilter.value = ALL
  classFilter.value = ALL
}

const filteredParticipants = computed(() => {
  const needle = search.value.trim().toLowerCase()
  return allParticipants.value.filter((row) => {
    if (
      roomFilter.value !== ALL &&
      roomByStudent.value.get(row.studentId)?.id !== roomFilter.value
    ) {
      return false
    }
    if (
      gradeFilter.value !== ALL &&
      gradeOfClass(row.classroomName) !== gradeFilter.value
    ) {
      return false
    }
    if (classFilter.value !== ALL && row.classroomName !== classFilter.value) {
      return false
    }
    if (needle === '') return true
    return (
      (row.studentName ?? '').toLowerCase().includes(needle) ||
      (row.nis ?? '').toLowerCase().includes(needle) ||
      (row.participantNumber ?? '').toLowerCase().includes(needle)
    )
  })
})

const attentionByRoom = computed(() => {
  const counts = new Map<string, number>()
  for (const live of rooms.value) {
    counts.set(live.room.id, attentionOf(live.participants, nowMs.value).length)
  }
  return counts
})

const attentionTotal = computed(() =>
  [...attentionByRoom.value.values()].reduce((sum, count) => sum + count, 0),
)

function open(roomId: string) {
  void router.push(`/exam/rooms/${roomId}`)
}

async function copyToken(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    toast.success('Token disalin.')
  } catch {
    toast.error('Token tidak dapat disalin.')
  }
}

const timelineTarget = ref<RoomMonitorParticipant | null>(null)
const recoveryTarget = ref<RoomMonitorParticipant | null>(null)
const recoveryAction = ref<RecoveryAction>('reopen')

function recover(row: RoomMonitorParticipant, action: RecoveryAction) {
  recoveryTarget.value = row
  recoveryAction.value = action
}

const recoveryRoomId = computed(() =>
  recoveryTarget.value === null
    ? ''
    : (roomByStudent.value.get(recoveryTarget.value.studentId)?.id ?? ''),
)

const recoveryMaxExtendMinutes = computed(() => {
  const session = recoveryTarget.value?.session
  if (session === null || session === undefined) return null
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
  const session = recoveryTarget.value?.session
  if (session === null || session === undefined) return true
  const windowEnd = Math.max(
    Date.parse(session.scheduleEndsAt),
    Date.parse(session.deadline) + session.extraMinutes * MS_PER_MINUTE,
  )
  return Date.now() <= windowEnd
})

const notePicker = ref(false)
const fieldNoteTarget = ref<RoomMonitorParticipant | null>(null)
const absenceTarget = ref<RoomMonitorParticipant | null>(null)

function placeOf(studentId: string): { roomId: string; slotId: string } | null {
  const room = roomByStudent.value.get(studentId)
  if (room === undefined) return null
  const slotId = slotByRoom.value.get(room.id)
  return slotId === undefined ? null : { roomId: room.id, slotId }
}

const absencePlace = computed(() =>
  absenceTarget.value === null ? null : placeOf(absenceTarget.value.studentId),
)

function changed() {
  void refresh()
  void refreshNotes()
}

const participantColumns = computed<ColumnDef<RoomMonitorParticipant>[]>(() => [
  {
    id: 'room',
    header: 'Ruang',
    meta: {
      align: 'center',
      mobileLabel: 'Ruang',
      mobileValue: roomNameOf,
    },
    cell: ({ row }) => h('span', roomNameOf(row.original)),
  },
  ...buildRoomParticipantColumns({
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
    onRelease: (row) => recover(row, 'release'),
    onReopen: (row) => recover(row, 'reopen'),
    onReset: (row) => recover(row, 'reset'),
    onExtendTime: (row) => recover(row, 'extend-time'),
    onAllowLate: (row) => recover(row, 'allow-late'),
  }),
])

const noteColumns = computed<ColumnDef<LiveNote>[]>(() => {
  const numberOf = new Map(
    allParticipants.value.map((row) => [row.studentId, row.participantNumber]),
  )
  const time = (item: LiveNote) =>
    shortClock.format(new Date(item.note.recordedAt))
  const number = (item: LiveNote) => numberOf.get(item.note.studentId) ?? '-'
  return [
    {
      id: 'room',
      header: 'Ruang',
      meta: {
        align: 'center',
        mobileLabel: 'Ruang',
        mobileValue: (item: LiveNote) => item.roomName,
      },
      cell: ({ row }) => row.original.roomName,
    },
    {
      id: 'time',
      header: 'Jam',
      meta: { align: 'center', mobileLabel: 'Jam', mobileValue: time },
      cell: ({ row }) => time(row.original),
    },
    {
      id: 'number',
      header: 'No. Peserta',
      meta: {
        align: 'center',
        mobileLabel: 'No. Peserta',
        mobileValue: number,
      },
      cell: ({ row }) => number(row.original),
    },
    {
      id: 'student',
      header: 'Nama',
      meta: {
        align: 'left',
        strong: true,
        mobile: 'title',
        mobileValue: (item: LiveNote) => item.note.studentName ?? '-',
      },
      cell: ({ row }) => row.original.note.studentName ?? '-',
    },
    {
      id: 'category',
      header: 'Kategori',
      meta: {
        align: 'center',
        mobileLabel: 'Kategori',
        mobileValue: (item: LiveNote) => item.note.category,
      },
      cell: ({ row }) => row.original.note.category,
    },
    {
      id: 'note',
      header: 'Catatan',
      meta: {
        align: 'left',
        mobileLabel: 'Catatan',
        mobileValue: (item: LiveNote) => item.note.note,
      },
      cell: ({ row }) => row.original.note.note,
    },
  ]
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Monitoring Semua Ruang</CardTitle>
        <div
          class="flex shrink-0 items-center gap-2 text-control text-muted-foreground"
        >
          <span>Diperbarui {{ updatedText }}</span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Muat ulang"
            @click="refresh"
          >
            <RefreshCw class="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <p
          v-if="error !== null"
          role="alert"
          class="text-control text-destructive"
        >
          {{ error }}
        </p>

        <Card
          gap="none"
          class="shrink-0"
        >
          <CardHeader standard>
            <CardTitle size="md">Ringkasan</CardTitle>
          </CardHeader>
          <CardContent variant="standard">
            <dl class="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
              <div class="flex flex-col gap-0.5">
                <dt class="text-control text-muted-foreground">Terdaftar</dt>
                <dd class="text-xl font-semibold">{{ totals.registered }}</dd>
              </div>
              <div class="flex flex-col gap-0.5">
                <dt class="text-control text-muted-foreground">Belum Mulai</dt>
                <dd class="text-xl font-semibold">{{ totals.notStarted }}</dd>
              </div>
              <div class="flex flex-col gap-0.5">
                <dt class="text-control text-muted-foreground">Mengerjakan</dt>
                <dd class="text-xl font-semibold">{{ totals.inProgress }}</dd>
              </div>
              <div class="flex flex-col gap-0.5">
                <dt class="text-control text-muted-foreground">Selesai</dt>
                <dd class="text-xl font-semibold">{{ totals.finished }}</dd>
              </div>
              <div class="flex flex-col gap-0.5">
                <dt class="text-control text-muted-foreground">
                  Perlu Tindakan
                </dt>
                <dd
                  :class="[
                    'text-xl font-semibold',
                    attentionTotal > 0 && 'text-destructive',
                  ]"
                >
                  {{ attentionTotal }}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <p
          v-if="loading && rooms.length === 0"
          class="text-control text-muted-foreground"
        >
          Memuat ruangan…
        </p>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card
            v-for="live in rooms"
            :key="live.room.id"
            gap="none"
          >
            <CardHeader standard>
              <CardTitle size="md">{{ live.room.name }}</CardTitle>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Buka ruang"
                @click="open(live.room.id)"
              >
                <ExternalLink class="size-4" />
              </Button>
            </CardHeader>
            <CardContent
              variant="standard"
              class="space-y-3"
            >
              <p
                v-if="live.failed"
                class="text-control text-destructive"
              >
                Data ruangan tidak dapat dimuat.
              </p>
              <template v-else>
                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-md border px-3 py-2 text-center">
                    <p class="text-control text-muted-foreground">
                      Token Ruang
                    </p>
                    <div class="flex items-center justify-center gap-1">
                      <p class="text-3xl font-bold tracking-widest">
                        {{ live.meta?.token?.accessCode ?? '-' }}
                      </p>
                      <Button
                        v-if="live.meta?.token"
                        variant="ghost"
                        size="icon"
                        aria-label="Salin token"
                        @click="copyToken(live.meta.token.accessCode)"
                      >
                        <Copy class="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div class="rounded-md border px-3 py-2 text-center">
                    <p class="text-control text-muted-foreground">Sisa Waktu</p>
                    <p class="text-3xl font-bold tabular-nums">
                      {{ remainingOf(live) }}
                    </p>
                  </div>
                </div>

                <dl class="grid gap-1 text-control">
                  <div class="flex justify-between gap-2">
                    <dt class="text-muted-foreground">Mata Pelajaran</dt>
                    <dd class="text-right font-medium">
                      {{ subjectOf(live) }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-2">
                    <dt class="text-muted-foreground">Waktu</dt>
                    <dd class="text-right">{{ windowOf(live) }}</dd>
                  </div>
                  <div class="flex justify-between gap-2">
                    <dt class="text-muted-foreground">Pengawas</dt>
                    <dd class="text-right">
                      {{ live.room.currentSupervisorName ?? '-' }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-2">
                    <dt class="text-muted-foreground">Teknisi</dt>
                    <dd class="text-right">
                      {{ live.room.technicianName ?? '-' }}
                    </dd>
                  </div>
                </dl>

                <div
                  v-if="live.meta"
                  class="space-y-2"
                >
                  <div class="flex items-center justify-between text-control">
                    <span class="text-muted-foreground">Progress</span>
                    <span class="font-medium">
                      {{ live.meta.summary.finishedCount }} /
                      {{ live.meta.summary.totalRegistered }} selesai
                    </span>
                  </div>
                  <Progress
                    :model-value="
                      live.meta.summary.totalRegistered === 0
                        ? 0
                        : (live.meta.summary.finishedCount /
                            live.meta.summary.totalRegistered) *
                          100
                    "
                  />
                  <dl class="grid grid-cols-4 gap-2 text-center text-control">
                    <div>
                      <dt class="text-muted-foreground">Belum</dt>
                      <dd class="font-semibold">
                        {{ live.meta.summary.notStartedCount }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-muted-foreground">Kerja</dt>
                      <dd class="font-semibold">
                        {{ live.meta.summary.inProgressCount }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-muted-foreground">Selesai</dt>
                      <dd class="font-semibold">
                        {{ live.meta.summary.finishedCount }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-muted-foreground">Tindakan</dt>
                      <dd
                        :class="[
                          'font-semibold',
                          (attentionByRoom.get(live.room.id) ?? 0) > 0 &&
                            'text-destructive',
                        ]"
                      >
                        {{ attentionByRoom.get(live.room.id) ?? 0 }}
                      </dd>
                    </div>
                  </dl>
                </div>
              </template>
            </CardContent>
          </Card>
        </div>

        <RoomActionQueue
          class="shrink-0"
          title="Perlu Tindakan Semua Ruang"
          :participants="allParticipants"
          :can-recover="abilities.recover"
          :room-of="roomNameOf"
          @reopen="(row) => recover(row, 'reopen')"
          @release="(row) => recover(row, 'release')"
          @timeline="(row) => (timelineTarget = row)"
        />

        <Card
          gap="none"
          class="shrink-0"
        >
          <CardHeader standard>
            <CardTitle size="md">Catatan Semua Ruang</CardTitle>
            <Button
              v-if="abilities.supervise || abilities.recover"
              @click="notePicker = true"
            >
              <Plus class="size-4" />
              Tambah
            </Button>
          </CardHeader>
          <CardContent variant="standard">
            <DataTable
              mobile="cards"
              hide-pagination
              hide-per-page
              :columns="noteColumns"
              :data="notes"
              :page-size="1000"
              :total-items="notes.length"
              item-label="catatan"
            >
              <template #empty>
                <DataTableEmpty message="Belum ada catatan." />
              </template>
            </DataTable>
          </CardContent>
        </Card>

        <Card
          gap="none"
          class="shrink-0"
        >
          <CardHeader standard>
            <CardTitle size="md">Peserta Semua Ruang</CardTitle>
          </CardHeader>
          <CardContent variant="standard">
            <DataTable
              mobile="cards"
              hide-pagination
              hide-per-page
              :columns="participantColumns"
              :data="filteredParticipants"
              :page-size="1000"
              :total-items="filteredParticipants.length"
              :is-loading="loading && allParticipants.length === 0"
              item-label="peserta"
            >
              <template #filters>
                <FloatingLabelField
                  v-for="field in filterFields"
                  :key="field.key"
                  :label="field.label"
                  :for="`${filterId}-${field.key}`"
                  class="w-fit min-w-28"
                  floating
                >
                  <Select
                    :model-value="field.value"
                    @update:model-value="(value) => field.set(String(value))"
                  >
                    <SelectTrigger
                      :id="`${filterId}-${field.key}`"
                      class="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem :value="ALL">Semua</SelectItem>
                      <SelectItem
                        v-for="option in field.options"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FloatingLabelField>
              </template>
              <template #header-right>
                <SearchInput
                  v-model="search"
                  class="sm:w-40"
                  label="Cari nama, NIS atau nomor"
                />
              </template>
              <template #mobile-toolbar>
                <SearchInput
                  v-model="search"
                  label="Cari nama, NIS atau nomor"
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
                    v-if="activeFilters > 0"
                    class="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
                  >
                    {{ activeFilters }}
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
      </CardContent>
      <CardFooter plain />
    </Card>

    <Dialog v-model:open="filterOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Filter Peserta</DialogTitle>
          <DialogDescription
            >Filter peserta berdasarkan ruang, tingkat dan
            kelas</DialogDescription
          >
        </DialogHeader>
        <DialogBody class="space-y-4">
          <FloatingLabelField
            v-for="field in filterFields"
            :key="field.key"
            :label="field.label"
            :for="`${filterId}-m-${field.key}`"
            floating
          >
            <Select
              :model-value="field.value"
              @update:model-value="(value) => field.set(String(value))"
            >
              <SelectTrigger
                :id="`${filterId}-m-${field.key}`"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="ALL">Semua</SelectItem>
                <SelectItem
                  v-for="option in field.options"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
        </DialogBody>
        <DialogFooter standard>
          <Button
            variant="outline"
            :disabled="activeFilters === 0"
            @click="resetFilters"
          >
            Atur Ulang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <RecordAbsenceDialog
      :open="absenceTarget !== null"
      :room-id="absencePlace?.roomId ?? ''"
      :slot-id="absencePlace?.slotId ?? ''"
      :participant="absenceTarget"
      @update:open="(value: boolean) => value || (absenceTarget = null)"
      @saved="changed"
    />

    <RecordFieldNoteDialog
      :open="fieldNoteTarget !== null || notePicker"
      room-id=""
      slot-id=""
      :participant="fieldNoteTarget"
      :participants="allParticipants"
      :place="placeOf"
      @update:open="
        (value: boolean) => {
          if (value) return
          fieldNoteTarget = null
          notePicker = false
        }
      "
      @saved="changed"
    />

    <SessionTimelineDialog
      :open="timelineTarget !== null"
      :student-name="timelineTarget?.studentName ?? null"
      :session-id="timelineTarget?.session?.sessionId ?? null"
      @update:open="(value: boolean) => value || (timelineTarget = null)"
    />

    <SessionRecoveryDialog
      :open="recoveryTarget !== null"
      :room-id="recoveryRoomId"
      :student-id="recoveryTarget?.studentId ?? null"
      :student-name="recoveryTarget?.studentName ?? null"
      :session-id="recoveryTarget?.session?.sessionId ?? null"
      :action="recoveryAction"
      :max-extend-minutes="recoveryMaxExtendMinutes"
      :window-open="recoveryWindowOpen"
      @update:open="(value: boolean) => value || (recoveryTarget = null)"
      @done="refresh"
    />
  </div>
</template>
