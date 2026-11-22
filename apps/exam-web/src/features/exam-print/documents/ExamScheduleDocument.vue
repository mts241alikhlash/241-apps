<script setup lang="ts">
import { computed } from 'vue'
import LetterheadKop from '@/features/exam-room/components/LetterheadKop.vue'
import { CARD_HEADER } from '@/features/exam-room/components/cardHeader'
import { gradeOfClassroom } from '@/features/exam-shared/classroomName'
import { usePackageSubjects } from '@/features/exam-shared/usePackageSubjects'
import { formatPrintDate, formatPrintRange } from '../format'
import type { PrintPack, PrintSchedule } from '../types'

const props = defineProps<{
  event: PrintPack['event']
  schedules: PrintSchedule[]
}>()

interface Entry {
  title: string
  classes: string[]
  whole: boolean
}

interface Slot {
  key: string
  number: number
  time: string
  cells: Entry[][]
}

interface Day {
  key: string
  label: string
  slots: Slot[]
}

const dayKey = (iso: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))

const { subjectOf: subjectOfPackage } = usePackageSubjects()

const subjectOf = (item: PrintSchedule): string =>
  subjectOfPackage(item.packageId, item.packageTitle)

const classLabel = (name: string | null): string =>
  (name ?? '-').replace(/^Kelas\s+/i, '')

const rows = computed(() =>
  props.schedules.filter((item) => item.status !== 'CANCELLED'),
)

const grades = computed(() =>
  [...new Set(rows.value.map((item) => gradeOfClassroom(item.classroomName)))]
    .filter((grade) => grade !== '-')
    .sort((a, b) => a.localeCompare(b, 'id', { numeric: true })),
)

const classesOfGrade = computed(() => {
  const map = new Map<string, Set<string>>()
  for (const item of rows.value) {
    const grade = gradeOfClassroom(item.classroomName)
    map.set(
      grade,
      (map.get(grade) ?? new Set()).add(classLabel(item.classroomName)),
    )
  }
  return map
})

const days = computed<Day[]>(() => {
  const byDay = new Map<string, PrintSchedule[]>()
  for (const item of rows.value) {
    const key = dayKey(item.startsAt)
    byDay.set(key, [...(byDay.get(key) ?? []), item])
  }
  return [...byDay]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, items]) => {
      const bySlot = new Map<string, PrintSchedule[]>()
      for (const item of items) {
        const slot = `${item.startsAt}|${item.endsAt}`
        bySlot.set(slot, [...(bySlot.get(slot) ?? []), item])
      }
      const slots = [...bySlot]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([slotKey, slotItems], index): Slot => ({
          key: slotKey,
          number: index + 1,
          time: formatPrintRange(slotItems[0].startsAt, slotItems[0].endsAt),
          cells: grades.value.map((grade) => {
            const mine = slotItems.filter(
              (item) => gradeOfClassroom(item.classroomName) === grade,
            )
            const byTitle = new Map<string, Set<string>>()
            for (const item of mine) {
              const subject = subjectOf(item)
              byTitle.set(
                subject,
                (byTitle.get(subject) ?? new Set()).add(
                  classLabel(item.classroomName),
                ),
              )
            }
            const total = classesOfGrade.value.get(grade)?.size ?? 0
            return [...byTitle].map(([title, classes]) => ({
              title,
              classes: [...classes].sort((a, b) =>
                a.localeCompare(b, 'id', { numeric: true }),
              ),
              whole: classes.size >= total,
            }))
          }),
        }))
      return {
        key,
        label: formatPrintDate(items[0].startsAt),
        slots,
      }
    })
})
</script>

<template>
  <section class="print-room exam-schedule">
    <div class="print-sheet space-y-1">
      <LetterheadKop />
      <div class="space-y-3">
        <div class="text-center">
          <p class="doc-title">Jadwal Ujian</p>
          <p class="doc-subtitle">{{ CARD_HEADER.title }}</p>
          <p class="doc-subtitle">{{ CARD_HEADER.period }}</p>
        </div>
        <table class="exam-grid">
          <thead>
            <tr>
              <th class="col-day">Hari, tanggal</th>
              <th class="col-time">Waktu</th>
              <th
                v-for="grade in grades"
                :key="grade"
              >
                {{ grade }}
              </th>
            </tr>
          </thead>
          <tbody
            v-for="day in days"
            :key="day.key"
          >
            <tr
              v-for="(slot, slotIndex) in day.slots"
              :key="slot.key"
            >
              <td
                v-if="slotIndex === 0"
                :rowspan="day.slots.length"
                class="col-day"
              >
                {{ day.label }}
              </td>
              <td class="col-time">{{ slot.time }}</td>
              <td
                v-for="(cell, index) in slot.cells"
                :key="index"
              >
                <template v-if="cell.length === 0">-</template>
                <p
                  v-for="entry in cell"
                  :key="entry.title"
                  class="entry"
                >
                  <span class="entry-title">{{ entry.title }}</span>
                  <span
                    v-if="!entry.whole"
                    class="entry-classes"
                  >
                    ({{ entry.classes.join(', ') }})
                  </span>
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.exam-schedule {
  font-family: 'Book Antiqua', 'Palatino Linotype', Palatino, serif;
}

.doc-title {
  font-size: 13pt;
  font-weight: 700;
  text-transform: uppercase;
}

.doc-subtitle {
  font-size: 11pt;
  font-weight: 700;
  text-transform: uppercase;
}

.exam-grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
}

.exam-grid th,
.exam-grid td {
  border: 0.2mm solid #94a3b8;
  padding: 1.6mm 1.4mm;
  text-align: center;
  vertical-align: middle;
}

.exam-grid thead th {
  background: #e2e8f0;
}

.exam-grid thead {
  display: table-header-group;
}

.exam-grid tr {
  break-inside: avoid;
}

.col-day {
  width: 42mm;
}

.col-time {
  width: 28mm;
  white-space: nowrap;
  color: #475569;
}

.entry {
  margin: 0;
}

.entry + .entry {
  margin-top: 1mm;
}

.entry-title {
}

.entry-classes {
  display: block;
  font-size: 7.5pt;
  color: #475569;
}
</style>
