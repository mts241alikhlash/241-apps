<script setup lang="ts">
import { computed, h, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ColumnDef } from '@tanstack/vue-table'
import { Copy, ExternalLink, Filter, Plus } from '@lucide/vue'
import { toast } from 'vue-sonner'
import {
  BackButton,
  DataTable,
  DataTableEmpty,
  SearchInput,
} from '@mts241alikhlash/ui'
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
import {
  EVENT_STATUSES,
  eventStatusLabel,
  type ExamEvent,
} from '@/features/exam-event/types'
import { examTypeLabel } from '@/features/exam-schedule/types'
import {
  compareClassroom,
  compareGrade,
  gradeOfClassroom,
} from '@/features/exam-shared/classroomName'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import { examEventService } from '../../exam-event/services/examEventService'
import { buildRoomEventColumns } from '../components/roomEventColumns'
import {
  buildMonitorDayColumns,
  buildMonitorSubjectColumns,
} from '../components/roomHierarchyColumns'
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
import {
  groupReports,
  type DayGroup,
  type SubjectGroup,
} from '../composables/useReportHierarchy'
import { abilitiesFor, examRoomService } from '../services/examRoomService'
import type {
  RecoveryAction,
  RoomMonitorParticipant,
  RoomReportSummary,
} from '../types'

type DrillRow = ExamEvent | DayGroup | SubjectGroup

const MAX_TOTAL_EXTRA_MINUTES = 180
const MS_PER_MINUTE = 60_000

const ALL = 'ALL'
const route = useRoute()
const router = useRouter()
const { hasPermission } = useAuthSession()
const abilities = computed(() => abilitiesFor(hasPermission))

const events = ref<ExamEvent[]>([])
const eventsLoaded = ref(false)
const eventsAvailable = ref(true)
const reports = ref<RoomReportSummary[]>([])
const reportsLoaded = ref(false)
const loadingEvents = ref(false)
const loadingReports = ref(false)
const reportsError = ref<string | null>(null)
const semesterId = ref('')
const eventStatusFilter = ref(ALL)
const drillSearch = ref('')
const eventFilterOpen = ref(false)
const drillPage = ref(1)
const drillPageSize = ref(25)

const paramValue = (name: 'eventId' | 'dayId' | 'subjectId'): string | null => {
  const value = route.params[name]
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw !== '' ? raw : null
}

const eventId = computed(() => paramValue('eventId'))
const dayId = computed(() => paramValue('dayId'))
const subjectId = computed(() => paramValue('subjectId'))

const activeEvent = computed(
  () => events.value.find((event) => event.id === eventId.value) ?? null,
)

const atEventList = computed(
  () => eventsAvailable.value && eventId.value === null,
)

const days = computed(() => groupReports(reports.value))

const activeDay = computed(
  () => days.value.find((day) => day.id === dayId.value) ?? null,
)

const activeSubject = computed(
  () =>
    activeDay.value?.subjects.find((item) => item.id === subjectId.value) ??
    null,
)

const level = computed<'event' | 'day' | 'subject' | 'live'>(() => {
  if (atEventList.value) return 'event'
  if (activeSubject.value !== null) return 'live'
  if (activeDay.value !== null) return 'subject'
  return 'day'
})

const selectedEventId = computed(() => eventId.value ?? '')

const slotByRoomTarget = computed(
  () =>
    new Map(
      (activeSubject.value?.rooms ?? []).map((item) => [
        item.roomId,
        item.slotId,
      ]),
    ),
)

const {
  rooms,
  notes,
  slotByRoom,
  refreshNotes,
  loading,
  error,
  nowMs,
  totals,
  start,
  stop,
  refresh,
} = useAllRoomsMonitor({
  eventId: selectedEventId,
  slotByRoomTarget,
})

const dayLabel = (day: DayGroup): string =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
    new Date(day.startsAt),
  )

const eventHref = (id: string | null) =>
  id === null
    ? '/exam/monitoring'
    : `/exam/monitoring/${encodeURIComponent(id)}`

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Monitoring Semua Ruang', href: '/exam/monitoring' },
  ...(activeEvent.value
    ? [{ title: activeEvent.value.name, href: eventHref(activeEvent.value.id) }]
    : []),
  ...(activeDay.value
    ? [
        {
          title: dayLabel(activeDay.value),
          href: `${eventHref(activeEvent.value?.id ?? eventId.value)}/${encodeURIComponent(activeDay.value.id)}`,
        },
      ]
    : []),
  ...(activeSubject.value
    ? [{ title: activeSubject.value.subjectName, href: '#' }]
    : []),
])

const pageTitle = computed(() => {
  if (activeSubject.value) return activeSubject.value.subjectName
  if (activeDay.value) return dayLabel(activeDay.value)
  if (activeEvent.value) return activeEvent.value.name
  return 'Monitoring Semua Ruang'
})

const backLabel = computed(() => {
  if (level.value === 'live') return 'Kembali ke daftar mapel'
  if (level.value === 'subject') return 'Kembali ke semua hari'
  return 'Kembali ke semua periode'
})

const drillItemLabel = computed(() => {
  if (level.value === 'event') return 'periode'
  if (level.value === 'day') return 'hari'
  return 'mapel'
})

const drillSearchLabel = computed(() => {
  if (level.value === 'event') return 'Cari periode'
  if (level.value === 'day') return 'Cari tanggal'
  return 'Cari mata pelajaran'
})

function goTo(
  nextEventId: string | null,
  nextDayId: string | null = null,
  nextSubjectId: string | null = null,
) {
  const params: Record<string, string> = {}
  if (nextEventId !== null) params.eventId = nextEventId
  if (nextDayId !== null) params.dayId = nextDayId
  if (nextDayId !== null && nextSubjectId !== null) {
    params.subjectId = nextSubjectId
  }
  void router.push({
    name: 'ExamRoomsLive',
    params,
  })
}

function goBack() {
  if (level.value === 'live') goTo(eventId.value, dayId.value)
  else if (level.value === 'subject') goTo(eventId.value)
  else goTo(null)
}

async function loadReports(targetEventId: string | null) {
  loadingReports.value = true
  reportsLoaded.value = false
  const result = await examRoomService.loadReports(targetEventId ?? undefined)
  loadingReports.value = false
  reportsLoaded.value = true
  if (result.success) {
    reports.value = result.data
    reportsError.value = null
  } else {
    reports.value = []
    reportsError.value = result.error
  }
}

async function loadEvents() {
  loadingEvents.value = true
  const result = await examEventService.loadEvents({ limit: 200 })
  loadingEvents.value = false
  if (result.success) {
    events.value = result.data
    eventsAvailable.value = true
    eventsLoaded.value = true
    reportsError.value = null
    if (eventId.value !== null) await loadReports(eventId.value)
  } else {
    events.value = []
    eventsAvailable.value = false
    eventsLoaded.value = true
    await loadReports(eventId.value)
  }
}

onMounted(loadEvents)

const shortClock = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

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

const roomFilter = ref(ALL)
const gradeFilter = ref(ALL)
const classFilter = ref(ALL)
const search = ref('')
const filterOpen = ref(false)
const filterId = useId()

const roomGrades = (live: LiveRoom): string[] =>
  [
    ...new Set(
      live.participants
        .map((row) => gradeOfClassroom(row.classroomName))
        .filter((grade) => grade !== '-'),
    ),
  ].sort(compareGrade)

const gradeOptions = computed(() =>
  [
    ...new Set(
      allParticipants.value.map((row) => gradeOfClassroom(row.classroomName)),
    ),
  ]
    .filter((grade) => grade !== '-')
    .sort(compareGrade),
)

const classOptions = computed(() =>
  [
    ...new Set(
      allParticipants.value
        .filter(
          (row) =>
            gradeFilter.value === ALL ||
            gradeOfClassroom(row.classroomName) === gradeFilter.value,
        )
        .map((row) => row.classroomName ?? ''),
    ),
  ]
    .filter((name) => name !== '')
    .sort(compareClassroom),
)

function setGrade(value: string) {
  gradeFilter.value = value
  if (
    classFilter.value !== ALL &&
    gradeOfClassroom(classFilter.value) !== value &&
    value !== ALL
  ) {
    classFilter.value = ALL
  }
}

const filteredEvents = computed(() => {
  const keyword = drillSearch.value.trim().toLocaleLowerCase('id')
  return events.value.filter(
    (event) =>
      (!semesterId.value || event.semesterId === semesterId.value) &&
      (eventStatusFilter.value === ALL ||
        event.status === eventStatusFilter.value) &&
      (!keyword ||
        [
          event.name,
          examTypeLabel(event.type),
          eventStatusLabel(event.status),
        ].some((v) => v.toLocaleLowerCase('id').includes(keyword))),
  )
})

const filteredDays = computed(() => {
  const keyword = drillSearch.value.trim().toLocaleLowerCase('id')
  if (!keyword) return days.value
  return days.value.filter((day) =>
    dayLabel(day).toLocaleLowerCase('id').includes(keyword),
  )
})

const filteredSubjects = computed(() => {
  const list = activeDay.value?.subjects ?? []
  const keyword = drillSearch.value.trim().toLocaleLowerCase('id')
  if (!keyword) return list
  return list.filter((subject) =>
    subject.subjectName.toLocaleLowerCase('id').includes(keyword),
  )
})

const drillRows = computed<DrillRow[]>(() => {
  if (level.value === 'event') return filteredEvents.value
  if (level.value === 'day') return filteredDays.value
  if (level.value === 'subject') return filteredSubjects.value
  return []
})

const paginatedDrillRows = computed(() => {
  const startIndex = (drillPage.value - 1) * drillPageSize.value
  return drillRows.value.slice(startIndex, startIndex + drillPageSize.value)
})

const drillLoading = computed(() =>
  level.value === 'event'
    ? loadingEvents.value
    : loadingEvents.value || loadingReports.value,
)

const eventColumns = computed(() =>
  buildRoomEventColumns({
    onOpen: (event) => goTo(event.id),
  }),
)

const dayColumns = computed(() =>
  buildMonitorDayColumns({
    onOpen: (day) => goTo(eventId.value, day.id),
  }),
)

const subjectColumns = computed(() =>
  buildMonitorSubjectColumns({
    onOpen: (subject) => goTo(eventId.value, subject.dayKey, subject.id),
  }),
)

const drillColumns = computed(() => {
  if (level.value === 'event')
    return eventColumns.value as ColumnDef<DrillRow>[]
  if (level.value === 'day') return dayColumns.value as ColumnDef<DrillRow>[]
  return subjectColumns.value as ColumnDef<DrillRow>[]
})

watch(
  [drillSearch, semesterId, eventStatusFilter],
  () => {
    drillPage.value = 1
  },
  { flush: 'sync' },
)

watch([drillRows, drillLoading], () => {
  if (drillLoading.value) return
  const lastPage = Math.max(
    1,
    Math.ceil(drillRows.value.length / drillPageSize.value),
  )
  if (drillPage.value > lastPage) drillPage.value = lastPage
})

watch([loadingEvents, eventsLoaded, eventId, activeEvent], () => {
  if (loadingEvents.value || !eventsLoaded.value || !eventsAvailable.value) {
    return
  }
  if (eventId.value !== null && activeEvent.value === null) goTo(null)
})

watch(
  [loadingReports, reportsLoaded, dayId, subjectId, activeDay, activeSubject],
  () => {
    if (loadingReports.value || !reportsLoaded.value) return
    const targetEvent = eventId.value
    if (eventsAvailable.value && targetEvent === null) return
    if (dayId.value !== null && activeDay.value === null) {
      goTo(targetEvent)
      return
    }
    if (
      dayId.value !== null &&
      subjectId.value !== null &&
      activeSubject.value === null
    ) {
      goTo(targetEvent, dayId.value)
    }
  },
)

watch(eventId, (next) => {
  drillSearch.value = ''
  drillPage.value = 1
  resetFilters()
  search.value = ''
  stop()
  if (!eventsLoaded.value) return
  if (next !== null || !eventsAvailable.value) void loadReports(next)
})

watch(
  () => activeSubject.value?.id ?? null,
  (next) => {
    drillSearch.value = ''
    drillPage.value = 1
    resetFilters()
    search.value = ''
    if (next !== null) start()
    else stop()
  },
  { immediate: true },
)

const sortedRooms = computed(() =>
  [...rooms.value].sort(
    (left, right) =>
      compareGrade(roomGrades(left)[0] ?? null, roomGrades(right)[0] ?? null) ||
      left.room.code.localeCompare(right.room.code, 'id', { numeric: true }),
  ),
)

const filterFields = computed(() => [
  {
    key: 'room',
    label: 'Ruang',
    value: roomFilter.value,
    allLabel: 'Semua',
    set: (value: string) => (roomFilter.value = value),
    options: sortedRooms.value.map((live) => ({
      value: live.room.id,
      label: live.room.name,
    })),
  },
  {
    key: 'grade',
    label: 'Tingkat',
    value: gradeFilter.value,
    allLabel: 'Semua',
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
    allLabel: 'Semua',
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

const participantPage = ref(1)
const participantPageSize = ref(25)

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
      gradeOfClassroom(row.classroomName) !== gradeFilter.value
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

const paginatedParticipants = computed(() => {
  const startIndex = (participantPage.value - 1) * participantPageSize.value
  return filteredParticipants.value.slice(
    startIndex,
    startIndex + participantPageSize.value,
  )
})

watch(
  [search, roomFilter, gradeFilter, classFilter, eventId],
  () => {
    participantPage.value = 1
  },
  { flush: 'sync' },
)

watch([filteredParticipants, loading], () => {
  if (loading.value) return
  const lastPage = Math.max(
    1,
    Math.ceil(filteredParticipants.value.length / participantPageSize.value),
  )
  if (participantPage.value > lastPage) participantPage.value = lastPage
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
  const slot = slotByRoomTarget.value.get(roomId)
  void router.push({
    path: `/exam/rooms/${roomId}`,
    query: {
      from: 'monitoring',
      ...(slot ? { slot } : {}),
      ...(eventId.value ? { periode: eventId.value } : {}),
      ...(dayId.value ? { hari: dayId.value } : {}),
      ...(subjectId.value ? { mapel: subjectId.value } : {}),
    },
  })
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
        <div class="flex min-w-0 items-center gap-3">
          <BackButton
            v-if="level !== 'event' && (eventsAvailable || level !== 'day')"
            :label="backLabel"
            @click="goBack"
          />
          <CardTitle class="truncate font-semibold">{{ pageTitle }}</CardTitle>
        </div>
      </CardHeader>
      <CardContent
        v-if="level !== 'live'"
        class="flex min-h-0 flex-1 flex-col overflow-auto pt-2 px-4 pb-4"
      >
        <div
          v-if="reportsError && level !== 'event'"
          class="m-4 space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-control">{{ reportsError }}</p>
          <Button
            variant="outline"
            @click="loadReports(eventId)"
          >
            Coba lagi
          </Button>
        </div>
        <DataTable
          v-else
          mobile="cards"
          :columns="drillColumns"
          :data="paginatedDrillRows"
          :page="drillPage"
          :page-size="drillPageSize"
          :total-items="drillRows.length"
          :is-loading="drillLoading"
          :item-label="drillItemLabel"
          @update:page="(next: number) => (drillPage = next)"
          @update:page-size="
            (size: number) => {
              drillPageSize = size
              drillPage = 1
            }
          "
        >
          <template
            v-if="level === 'event'"
            #filters
          >
            <AcademicPeriodFilter v-model="semesterId" />
            <FloatingLabelField
              label="Status"
              :for="`${filterId}-event-status`"
              class="w-fit min-w-28"
              floating
            >
              <Select v-model="eventStatusFilter">
                <SelectTrigger
                  :id="`${filterId}-event-status`"
                  class="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="ALL">Semua</SelectItem>
                  <SelectItem
                    v-for="item in EVENT_STATUSES"
                    :key="item"
                    :value="item"
                  >
                    {{ eventStatusLabel(item) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>
          </template>
          <template #header-right>
            <SearchInput
              v-model="drillSearch"
              class="sm:w-40"
              :label="drillSearchLabel"
            />
          </template>
          <template #mobile-toolbar>
            <SearchInput
              v-model="drillSearch"
              :label="drillSearchLabel"
            />
          </template>
          <template
            v-if="level === 'event'"
            #mobile-filter
          >
            <Button
              variant="outline"
              class="relative shrink-0"
              @click="eventFilterOpen = true"
            >
              <Filter class="size-4" />
              Filter
              <span
                v-if="eventStatusFilter !== ALL"
                class="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
              >
                1
              </span>
            </Button>
          </template>
          <template
            v-if="level === 'event'"
            #mobile-chips
          >
            <div
              v-if="eventStatusFilter !== ALL"
              class="flex flex-wrap gap-2 text-control"
            >
              <Button
                variant="outline"
                @click="eventStatusFilter = ALL"
              >
                Hapus filter status: {{ eventStatusLabel(eventStatusFilter) }}
              </Button>
            </div>
          </template>
          <template #empty>
            <DataTableEmpty
              :message="
                level === 'event'
                  ? 'Belum ada periode ujian.'
                  : level === 'day'
                    ? 'Belum ada jadwal ruangan pada periode ini.'
                    : 'Tidak ada mata pelajaran pada hari ini.'
              "
            />
          </template>
        </DataTable>
      </CardContent>
      <CardContent
        v-else
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
            v-for="live in sortedRooms"
            :key="live.room.id"
            gap="none"
          >
            <CardHeader standard>
              <CardTitle size="md">{{ live.room.name }}</CardTitle>
              <Button
                variant="outline"
                size="icon-sm"
                class="shrink-0"
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
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div class="min-w-0 rounded-md border px-2 py-2 text-center">
                    <p class="text-control text-muted-foreground">
                      Token Ruang
                    </p>
                    <div
                      class="mt-0.5 flex flex-wrap items-center justify-center gap-1"
                    >
                      <p
                        class="whitespace-nowrap text-base font-bold tracking-wider sm:text-lg"
                      >
                        {{ live.meta?.token?.accessCode ?? '-' }}
                      </p>
                      <Button
                        v-if="live.meta?.token"
                        variant="ghost"
                        size="icon-sm"
                        class="size-7 shrink-0"
                        aria-label="Salin token"
                        @click="copyToken(live.meta.token.accessCode)"
                      >
                        <Copy class="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div class="min-w-0 rounded-md border px-2 py-2 text-center">
                    <p class="text-control text-muted-foreground">Sisa Waktu</p>
                    <p
                      class="mt-0.5 break-words text-base font-bold leading-tight tabular-nums sm:text-lg"
                    >
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
              :columns="participantColumns"
              :data="paginatedParticipants"
              :page="participantPage"
              :page-size="participantPageSize"
              :total-items="filteredParticipants.length"
              :is-loading="loading && allParticipants.length === 0"
              item-label="peserta"
              @update:page="(next: number) => (participantPage = next)"
              @update:page-size="
                (size: number) => {
                  participantPageSize = size
                  participantPage = 1
                }
              "
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
                      <SelectItem :value="ALL">{{ field.allLabel }}</SelectItem>
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

    <Dialog v-model:open="eventFilterOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Filter Periode</DialogTitle>
          <DialogDescription>Filter daftar periode ujian</DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <AcademicPeriodFilter v-model="semesterId" />
          <FloatingLabelField
            label="Status"
            :for="`${filterId}-m-event-status`"
            floating
          >
            <Select v-model="eventStatusFilter">
              <SelectTrigger
                :id="`${filterId}-m-event-status`"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="ALL">Semua</SelectItem>
                <SelectItem
                  v-for="item in EVENT_STATUSES"
                  :key="item"
                  :value="item"
                >
                  {{ eventStatusLabel(item) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
        </DialogBody>
        <DialogFooter standard>
          <Button
            variant="outline"
            :disabled="eventStatusFilter === ALL"
            @click="eventStatusFilter = ALL"
          >
            Atur Ulang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
                <SelectItem :value="ALL">{{ field.allLabel }}</SelectItem>
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
