<script setup lang="ts">
import { computed } from 'vue'
import { formatEntityName } from '@mts241alikhlash/web-shared/utils/utils'
import { useAuthSession } from '@/features/platform/auth'
import type {
  ScheduleDay,
  ScheduleClassroom,
  ScheduleTimeSlot,
  ScheduleLessonMap,
} from '../types'

const props = defineProps<{
  isPersonal: boolean
  user: { identifier?: string } | null
  selectedClassroom: ScheduleClassroom | undefined
  sortedTimeSlots: ScheduleTimeSlot[]
  days: ScheduleDay[]
  lessonMap: ScheduleLessonMap
}>()

const { hasPermission } = useAuthSession()
const isStudent = computed(
  () => hasPermission('students.read-own') && !hasPermission('students.read'),
)

const gridCols = computed(() => `auto auto repeat(${props.days.length}, 1fr)`)

function parseMinutes(val: string): number {
  if (!val) return 0
  const d = new Date(val)
  if (!isNaN(d.getTime())) return d.getUTCHours() * 60 + d.getUTCMinutes()
  const parts = val.substring(0, 5).split(':')
  return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0)
}

function timesOverlap(a: ScheduleTimeSlot, b: ScheduleTimeSlot): boolean {
  const aStart = parseMinutes(a.startTime)
  const aEnd = parseMinutes(a.endTime)
  const bStart = parseMinutes(b.startTime)
  const bEnd = parseMinutes(b.endTime)
  return aStart < bEnd && bStart < aEnd
}

const overlayMap = computed(() => {
  const lessonSlots = props.sortedTimeSlots.filter(
    (ts) => ts.isLesson !== false,
  )
  const nonLessonSlots = props.sortedTimeSlots.filter(
    (ts) => ts.isLesson === false,
  )
  const map: Record<string, Record<string, ScheduleTimeSlot>> = {}

  for (const nls of nonLessonSlots) {
    const nlsDays = nls.days ?? []
    for (const ls of lessonSlots) {
      if (!timesOverlap(nls, ls)) continue
      for (const day of props.days) {
        if (nlsDays.length === 0 || nlsDays.includes(day.value)) {
          map[ls.id] ??= {}
          map[ls.id][day.value] = nls
        }
      }
    }
  }
  return map
})

const mergedNonLessonIds = computed(() => {
  const ids = new Set<string>()
  const lessonSlots = props.sortedTimeSlots.filter(
    (ts) => ts.isLesson !== false,
  )
  const nonLessonSlots = props.sortedTimeSlots.filter(
    (ts) => ts.isLesson === false,
  )
  for (const nls of nonLessonSlots) {
    if (lessonSlots.some((ls) => timesOverlap(nls, ls))) {
      ids.add(nls.id)
    }
  }
  return ids
})

const displaySlots = computed(() =>
  props.sortedTimeSlots.filter((ts) => !mergedNonLessonIds.value.has(ts.id)),
)

function appliesOn(slot: ScheduleTimeSlot, day: string): boolean {
  const d = slot.days ?? []
  return d.length === 0 || d.includes(day)
}

function formatPukul(startVal: string, endVal: string): string {
  return `${toHHMM(startVal)} - ${toHHMM(endVal)}`
}

function toHHMM(val: string): string {
  if (!val) return '-'
  const d = new Date(val)
  if (!isNaN(d.getTime())) {
    const h = d.getUTCHours().toString().padStart(2, '0')
    const m = d.getUTCMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  }
  return String(val).substring(0, 5)
}
</script>

<template>
  <div class="border rounded-md bg-background">
    <div
      class="schedule-grid"
      :style="{
        display: 'grid',
        gridTemplateColumns: gridCols,
      }"
    >
      <div class="cell header-cell">Pukul</div>
      <div class="cell header-cell">Jam</div>
      <div
        v-for="(day, i) in days"
        :key="'h-' + day.value"
        class="cell header-cell"
        :class="{ 'border-r-0': i === days.length - 1 }"
      >
        {{ day.label }}
      </div>

      <div
        v-for="(ts, idx) in displaySlots"
        :key="ts.id"
        class="schedule-row"
      >
        <template v-if="ts.isLesson === false">
          <div class="cell break-cell">
            {{ formatPukul(ts.startTime, ts.endTime) }}
          </div>
          <div
            class="cell break-cell font-semibold text-amber-600 dark:text-amber-400"
          >
            {{ formatEntityName(ts.name) }}
          </div>
          <div
            v-if="!ts.days?.length"
            class="cell break-cell italic text-muted-foreground border-r-0"
            :style="{ gridColumn: `span ${days.length}` }"
          >
            {{ formatEntityName(ts.name) }}
          </div>
          <template v-else>
            <div
              v-for="(day, i) in days"
              :key="'b-' + day.value"
              class="cell break-cell italic text-muted-foreground"
              :class="{ 'border-r-0': i === days.length - 1 }"
            >
              <template v-if="appliesOn(ts, day.value)">
                {{ formatEntityName(ts.name) }}
              </template>
            </div>
          </template>
        </template>

        <template v-else>
          <div
            class="cell lesson-cell"
            :class="idx % 2 === 1 ? 'stripe' : ''"
          >
            {{ formatPukul(ts.startTime, ts.endTime) }}
          </div>
          <div
            class="cell lesson-cell text-sm"
            :class="idx % 2 === 1 ? 'stripe' : ''"
          >
            {{ formatEntityName(ts.name) }}
          </div>
          <div
            v-for="(day, i) in days"
            :key="'l-' + day.value"
            class="cell lesson-cell"
            :class="[
              idx % 2 === 1 ? 'stripe' : '',
              { 'border-r-0': i === days.length - 1 },
              { 'overlay-cell': !!overlayMap[ts.id]?.[day.value] },
            ]"
          >
            <template v-if="overlayMap[ts.id]?.[day.value]">
              <span
                class="text-[10px] font-semibold text-amber-600 dark:text-amber-400 italic"
              >
                {{ formatEntityName(overlayMap[ts.id][day.value].name) }}
              </span>
            </template>

            <template v-else-if="lessonMap[ts.id]?.[day.value]">
              <p class="font-medium text-foreground text-xs leading-tight">
                {{ lessonMap[ts.id]?.[day.value]?.subject?.name ?? '–' }}
              </p>
              <p
                v-if="
                  isStudent &&
                  lessonMap[ts.id]?.[day.value]?.employee?.user?.profile?.name
                "
                class="text-[10px] text-muted-foreground mt-0.5 truncate"
              >
                {{
                  lessonMap[ts.id]?.[day.value]?.employee?.user?.profile?.name
                }}
              </p>
              <p
                v-else-if="
                  isPersonal &&
                  !isStudent &&
                  lessonMap[ts.id]?.[day.value]?.classroom?.name
                "
                class="text-[10px] text-primary/80 font-medium mt-0.5 truncate"
              >
                {{
                  lessonMap[ts.id]?.[day.value]?.classroom?.code ??
                  lessonMap[ts.id]?.[day.value]?.classroom?.name ??
                  '-'
                }}
              </p>
              <p
                v-else-if="
                  !isPersonal &&
                  lessonMap[ts.id]?.[day.value]?.employee?.user?.profile?.name
                "
                class="text-[10px] text-muted-foreground mt-0.5 truncate"
              >
                {{
                  lessonMap[ts.id]?.[day.value]?.employee?.user?.profile?.name
                }}
              </p>
            </template>

            <span
              v-else
              class="text-muted-foreground/20 select-none"
              >–</span
            >
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cell {
  padding: 0.25rem 0.375rem;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--muted-foreground);
  border-bottom: 1px solid var(--border);
  border-right: 1px solid var(--border);
}

.header-cell {
  background: var(--muted);
  color: var(--muted-foreground);
  font-weight: 700;
  font-size: 0.6875rem;
  padding: 0.375rem;
}

.break-cell {
  background: rgb(255 251 235 / 0.6);
}
:is(.dark) .break-cell {
  background: rgb(69 26 3 / 0.2);
}

.lesson-cell {
  transition: background-color 0.15s ease;
}

.overlay-cell {
  background: rgb(255 251 235 / 0.4);
}
:is(.dark) .overlay-cell {
  background: rgb(69 26 3 / 0.15);
}

.stripe {
  background: color-mix(in oklch, var(--muted) 30%, transparent);
}

.schedule-row {
  display: contents;
}

.schedule-row:last-child > .cell {
  border-bottom: none;
}
</style>
