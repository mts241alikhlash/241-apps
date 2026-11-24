<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ColumnDef } from '@tanstack/vue-table'
import { Filter } from '@lucide/vue'
import {
  BackButton,
  DataTable,
  SearchInput,
  DataTableEmpty,
} from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import {
  EVENT_STATUSES,
  eventStatusLabel,
  type ExamEvent,
} from '@/features/exam-event/types'
import { examTypeLabel } from '@/features/exam-schedule/types'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import { examEventService } from '../../exam-event/services/examEventService'
import {
  buildMonitorDayColumns,
  buildMonitorSubjectColumns,
} from '../components/roomHierarchyColumns'
import { buildRoomEventColumns } from '../components/roomEventColumns'
import {
  buildRoomOverviewColumns,
  type RoomOverviewRow,
  type RoomSlotPhase,
} from '../components/roomOverviewColumns'
import {
  groupReports,
  type DayGroup,
  type SubjectGroup,
} from '../composables/useReportHierarchy'
import { examRoomService } from '../services/examRoomService'
import type { RoomOverview, RoomReportSummary } from '../types'

type TableRow = ExamEvent | DayGroup | SubjectGroup | RoomOverviewRow

const ALL = 'ALL'

const route = useRoute()
const router = useRouter()

const events = ref<ExamEvent[]>([])
const eventsLoaded = ref(false)
const eventsAvailable = ref(true)
const reports = ref<RoomReportSummary[]>([])
const reportsLoaded = ref(false)
const rooms = ref<RoomOverview[]>([])
const loadingEvents = ref(false)
const loadingReports = ref(false)
const error = ref<string | null>(null)

const semesterId = ref('')
const eventStatusFilter = ref<typeof ALL | ExamEvent['status']>(ALL)
const search = ref('')
const statusFilter = ref<'ALL' | RoomSlotPhase>('ALL')
const filterId = useId()
const mobileFilterId = useId()
const filterOpen = ref(false)

const page = ref(1)
const pageSize = ref(25)

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

const level = computed<'event' | 'day' | 'subject' | 'room'>(() => {
  if (atEventList.value) return 'event'
  if (activeSubject.value !== null) return 'room'
  if (activeDay.value !== null) return 'subject'
  return 'day'
})

const loading = computed(() =>
  level.value === 'event'
    ? loadingEvents.value
    : loadingEvents.value || loadingReports.value,
)

const dayLabel = (day: DayGroup): string =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
    new Date(day.startsAt),
  )

const eventHref = (id: string | null) =>
  id === null ? '/exam/rooms' : `/exam/rooms/period/${encodeURIComponent(id)}`

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Monitoring', href: '/exam/rooms' },
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
  return 'Monitoring'
})

const backLabel = computed(() => {
  if (level.value === 'room') return 'Kembali ke daftar mapel'
  if (level.value === 'subject') return 'Kembali ke semua hari'
  return 'Kembali ke semua periode'
})

const itemLabel = computed(() => {
  if (level.value === 'event') return 'periode'
  if (level.value === 'day') return 'hari'
  if (level.value === 'subject') return 'mapel'
  return 'ruangan'
})

const searchLabel = computed(() => {
  if (level.value === 'event') return 'Cari periode'
  if (level.value === 'day') return 'Cari tanggal'
  if (level.value === 'subject') return 'Cari mata pelajaran'
  return 'Cari ruangan'
})

const overviewByRoom = computed(
  () => new Map(rooms.value.map((room) => [room.id, room])),
)

const slotPhaseOf = (startsAt: string, endsAt: string): RoomSlotPhase => {
  const now = Date.now()
  const begin = Date.parse(startsAt)
  const end = Date.parse(endsAt)
  if (now < begin) return 'WAITING'
  if (now <= end) return 'ACTIVE'
  return 'FINISHED'
}

const enrichedRooms = computed<RoomOverviewRow[]>(() =>
  (activeSubject.value?.rooms ?? []).map((item) => {
    const base = overviewByRoom.value.get(item.roomId)
    const phase = slotPhaseOf(item.startsAt, item.endsAt)
    return {
      id: item.roomId,
      slotId: item.slotId,
      eventId: eventId.value ?? base?.eventId ?? '',
      code: item.roomCode,
      name: item.roomName,
      building: base?.building ?? null,
      capacity: base?.capacity ?? item.registeredCount,
      registeredCount: base?.registeredCount ?? item.registeredCount,
      technicianName: base?.technicianName ?? null,
      currentSupervisorName: item.supervisorName ?? null,
      isSubstituted: base?.isSubstituted ?? false,
      isActiveNow: phase === 'ACTIVE',
      slotPhase: phase,
    }
  }),
)

const activeFiltersCount = computed(() => {
  if (level.value === 'event') return Number(eventStatusFilter.value !== ALL)
  if (level.value === 'room') return Number(statusFilter.value !== ALL)
  return 0
})

function resetFilters() {
  if (level.value === 'event') {
    eventStatusFilter.value = ALL
    return
  }
  statusFilter.value = ALL
}

const filteredEvents = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id')
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
  const keyword = search.value.trim().toLocaleLowerCase('id')
  if (!keyword) return days.value
  return days.value.filter((day) =>
    dayLabel(day).toLocaleLowerCase('id').includes(keyword),
  )
})

const filteredSubjects = computed(() => {
  const list = activeDay.value?.subjects ?? []
  const keyword = search.value.trim().toLocaleLowerCase('id')
  if (!keyword) return list
  return list.filter((subject) =>
    subject.subjectName.toLocaleLowerCase('id').includes(keyword),
  )
})

const filteredRooms = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id')
  return enrichedRooms.value
    .filter((room) => {
      if (statusFilter.value !== ALL && room.slotPhase !== statusFilter.value) {
        return false
      }
      if (!keyword) return true
      return [
        room.name,
        room.currentSupervisorName ?? '',
        room.technicianName ?? '',
      ].some((v) => v.toLocaleLowerCase('id').includes(keyword))
    })
    .sort(
      (left, right) =>
        left.code.localeCompare(right.code, 'id', { numeric: true }) ||
        left.name.localeCompare(right.name, 'id', { numeric: true }),
    )
})

const levelRows = computed<TableRow[]>(() => {
  if (level.value === 'event') return filteredEvents.value
  if (level.value === 'day') return filteredDays.value
  if (level.value === 'subject') return filteredSubjects.value
  return filteredRooms.value
})

const paginatedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return levelRows.value.slice(start, start + pageSize.value)
})

watch(
  [search, semesterId, eventStatusFilter, statusFilter],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)

watch([levelRows, loading], () => {
  if (loading.value) return
  const lastPage = Math.max(
    1,
    Math.ceil(levelRows.value.length / pageSize.value),
  )
  if (page.value > lastPage) page.value = lastPage
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
  search.value = ''
  statusFilter.value = ALL
  page.value = 1
  if (!eventsLoaded.value) return
  if (next !== null || !eventsAvailable.value) void loadPeriodData(next)
})

watch(
  () => activeSubject.value?.id ?? null,
  () => {
    search.value = ''
    statusFilter.value = ALL
    page.value = 1
  },
)

function goTo(
  nextEventId: string | null,
  nextDayId: string | null = null,
  nextSubjectId: string | null = null,
) {
  if (nextEventId === null && eventsAvailable.value) {
    void router.push({ name: 'ExamRoomOverview' })
    return
  }
  const params: Record<string, string> = {}
  if (nextEventId !== null) params.eventId = nextEventId
  if (nextDayId !== null) params.dayId = nextDayId
  if (nextDayId !== null && nextSubjectId !== null) {
    params.subjectId = nextSubjectId
  }
  if (nextEventId !== null) {
    void router.push({ name: 'ExamRoomOverviewPeriod', params })
    return
  }
  void router.push({ name: 'ExamRoomOverview' })
}

function goBack() {
  if (level.value === 'room') goTo(eventId.value, dayId.value)
  else if (level.value === 'subject') goTo(eventId.value)
  else goTo(null)
}

function goToPage(next: number) {
  page.value = next
}

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

function openRoom(room: RoomOverviewRow) {
  void router.push({
    path: `/exam/rooms/${room.id}`,
    query: {
      ...(room.slotId ? { slot: room.slotId } : {}),
      ...(eventId.value ? { periode: eventId.value } : {}),
      ...(dayId.value ? { hari: dayId.value } : {}),
      ...(subjectId.value ? { mapel: subjectId.value } : {}),
    },
  })
}

function openOverviewRow(row: TableRow) {
  if ('slotId' in row) {
    openRoom(row)
    return
  }
  if ('dayKey' in row) {
    goTo(eventId.value, row.dayKey, row.id)
    return
  }
  if (level.value === 'day') {
    goTo(eventId.value, row.id)
    return
  }
  goTo(row.id)
}

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

const roomColumns = computed(() =>
  buildRoomOverviewColumns({
    onOpen: openRoom,
  }),
)

const columns = computed(() => {
  if (level.value === 'event')
    return eventColumns.value as ColumnDef<TableRow>[]
  if (level.value === 'day') return dayColumns.value as ColumnDef<TableRow>[]
  if (level.value === 'subject') {
    return subjectColumns.value as ColumnDef<TableRow>[]
  }
  return roomColumns.value as ColumnDef<TableRow>[]
})

async function loadPeriodData(targetEventId: string | null) {
  loadingReports.value = true
  reportsLoaded.value = false
  const [reportsResult, overviewResult] = await Promise.all([
    examRoomService.loadReports(targetEventId ?? undefined),
    examRoomService.loadOverview(targetEventId ?? undefined),
  ])
  loadingReports.value = false
  reportsLoaded.value = true
  if (reportsResult.success) {
    reports.value = reportsResult.data
    error.value = null
  } else {
    reports.value = []
    error.value = reportsResult.error
  }
  rooms.value = overviewResult.success ? overviewResult.data : []
}

async function loadEvents() {
  loadingEvents.value = true
  const result = await examEventService.loadEvents({ limit: 200 })
  loadingEvents.value = false
  if (result.success) {
    events.value = result.data
    eventsAvailable.value = true
    eventsLoaded.value = true
    error.value = null
    if (eventId.value !== null) await loadPeriodData(eventId.value)
  } else {
    events.value = []
    eventsAvailable.value = false
    eventsLoaded.value = true
    await loadPeriodData(eventId.value)
  }
}

const slotStatusLabel = (value: RoomSlotPhase): string => {
  if (value === 'ACTIVE') return 'Berlangsung'
  if (value === 'FINISHED') return 'Selesai'
  return 'Menunggu'
}

onMounted(loadEvents)
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
        class="flex min-h-0 flex-1 flex-col overflow-auto pt-2 px-4 pb-4"
      >
        <div
          v-if="error"
          class="m-4 space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-control">{{ error }}</p>
          <Button
            variant="outline"
            @click="level === 'event' ? loadEvents() : loadPeriodData(eventId)"
          >
            Coba lagi
          </Button>
        </div>
        <template v-else>
          <DataTable
            mobile="cards"
            :columns="columns"
            :data="paginatedRows"
            :page="page"
            :page-size="pageSize"
            :total-items="levelRows.length"
            :is-loading="loading"
            :item-label="itemLabel"
            @row-click="openOverviewRow"
            @update:page="goToPage"
            @update:page-size="changePageSize"
          >
            <template
              v-if="level === 'event' || level === 'room'"
              #filters
            >
              <template v-if="level === 'event'">
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
              <FloatingLabelField
                v-else
                label="Status"
                :for="`${filterId}-status`"
                class="w-fit min-w-28"
                floating
              >
                <Select v-model="statusFilter">
                  <SelectTrigger
                    :id="`${filterId}-status`"
                    class="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua</SelectItem>
                    <SelectItem value="ACTIVE">Berlangsung</SelectItem>
                    <SelectItem value="WAITING">Menunggu</SelectItem>
                    <SelectItem value="FINISHED">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </FloatingLabelField>
            </template>
            <template #header-right>
              <SearchInput
                v-model="search"
                class="sm:w-40"
                :label="searchLabel"
              />
            </template>

            <template #mobile-toolbar>
              <SearchInput
                v-model="search"
                :label="searchLabel"
              />
            </template>
            <template
              v-if="level === 'event' || level === 'room'"
              #mobile-filter
            >
              <Button
                variant="outline"
                class="relative shrink-0"
                @click="filterOpen = true"
              >
                <Filter class="size-4" />
                Filter
                <span
                  v-if="activeFiltersCount > 0"
                  class="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
                >
                  {{ activeFiltersCount }}
                </span>
              </Button>
            </template>

            <template
              v-if="level === 'event' || level === 'room'"
              #mobile-chips
            >
              <div
                v-if="activeFiltersCount"
                class="flex flex-wrap gap-2 text-control"
              >
                <Button
                  v-if="level === 'event' && eventStatusFilter !== ALL"
                  variant="outline"
                  @click="eventStatusFilter = ALL"
                >
                  Hapus filter status:
                  {{ eventStatusLabel(eventStatusFilter) }}
                </Button>
                <Button
                  v-else-if="level === 'room' && statusFilter !== ALL"
                  variant="outline"
                  @click="statusFilter = ALL"
                >
                  Hapus filter status:
                  {{ slotStatusLabel(statusFilter) }}
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
                      : level === 'subject'
                        ? 'Tidak ada mata pelajaran pada hari ini.'
                        : activeFiltersCount || search
                          ? 'Tidak ada ruangan yang cocok dengan filter.'
                          : 'Belum ada ruangan aktif untuk mapel ini.'
                "
              />
            </template>
          </DataTable>
        </template>
      </CardContent>
      <CardFooter plain />
    </Card>

    <Dialog v-model:open="filterOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>{{
            level === 'event' ? 'Filter Periode' : 'Filter Ruang Ujian'
          }}</DialogTitle>
          <DialogDescription>{{
            level === 'event'
              ? 'Filter daftar periode ujian'
              : 'Filter ruangan berdasarkan status'
          }}</DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <template v-if="level === 'event'">
            <AcademicPeriodFilter v-model="semesterId" />
            <FloatingLabelField
              label="Status"
              :for="`${mobileFilterId}-event-status`"
              floating
            >
              <Select v-model="eventStatusFilter">
                <SelectTrigger
                  :id="`${mobileFilterId}-event-status`"
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
          <FloatingLabelField
            v-else
            label="Status"
            :for="`${mobileFilterId}-status`"
            floating
          >
            <Select v-model="statusFilter">
              <SelectTrigger
                :id="`${mobileFilterId}-status`"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                <SelectItem value="ACTIVE">Berlangsung</SelectItem>
                <SelectItem value="WAITING">Menunggu</SelectItem>
                <SelectItem value="FINISHED">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
        </DialogBody>
        <DialogFooter standard>
          <Button
            variant="outline"
            :disabled="activeFiltersCount === 0"
            @click="resetFilters"
          >
            Atur Ulang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
