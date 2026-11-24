<script setup lang="ts">
import { computed } from 'vue'
import LetterheadKop from '@/features/exam-room/components/LetterheadKop.vue'
import { CARD_HEADER } from '@/features/exam-room/components/cardHeader'
import { formatScore } from '@/features/exam-grading/types'
import type { GradingSheetStudent } from './gradingSheet'
import {
  activeScoreColumns,
  formatTotalScore,
  scoreOfType,
} from './studentScoreRecap'

const props = defineProps<{
  subject: string
  classroom: string
  date: string
  timeRange: string
  teacher: string
  students: GradingSheetStudent[]
  stacked?: boolean
}>()

const typeColumns = computed(() => activeScoreColumns(props.students))

const teacherName = computed(() =>
  props.teacher === '' ? '(.................................)' : props.teacher,
)

const displayTeacher = computed(() =>
  props.teacher === '' ? '-' : props.teacher,
)

function cellScore(
  student: GradingSheetStudent,
  type: (typeof typeColumns.value)[number]['type'],
): string {
  const score = scoreOfType(student, type)
  return score === null ? '-' : formatScore(score)
}
</script>

<template>
  <section
    :class="[
      'print-room student-score-recap-sheet',
      stacked && 'break-after-page last:break-after-auto',
    ]"
  >
    <div class="print-sheet space-y-2">
      <LetterheadKop />
      <div class="space-y-0.5">
        <p class="sheet-title">Rekap Nilai Siswa</p>
        <p class="sheet-subtitle">{{ CARD_HEADER.title }}</p>
        <p class="sheet-subtitle">{{ CARD_HEADER.period }}</p>
      </div>

      <div class="sheet-meta">
        <table class="meta-left">
          <tbody>
            <tr>
              <td class="sheet-label">Mata Pelajaran</td>
              <td class="sheet-colon">:</td>
              <td class="sheet-value">{{ subject }}</td>
            </tr>
            <tr>
              <td class="sheet-label">Kelas</td>
              <td class="sheet-colon">:</td>
              <td class="sheet-value">{{ classroom }}</td>
            </tr>
            <tr>
              <td class="sheet-label">Guru Mapel</td>
              <td class="sheet-colon">:</td>
              <td class="sheet-value">{{ displayTeacher }}</td>
            </tr>
          </tbody>
        </table>
        <table class="meta-right">
          <tbody>
            <tr>
              <td class="sheet-label">Hari, Tanggal</td>
              <td class="sheet-colon">:</td>
              <td class="sheet-value">{{ date }}</td>
            </tr>
            <tr>
              <td class="sheet-label">Waktu</td>
              <td class="sheet-colon">:</td>
              <td class="sheet-value">{{ timeRange }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <table class="sheet-table">
        <thead>
          <tr>
            <th class="col-no">No</th>
            <th class="col-number">No. Peserta</th>
            <th class="is-left">Nama Siswa</th>
            <th
              v-for="column in typeColumns"
              :key="column.type"
              class="col-type"
            >
              {{ column.label }} ({{ formatScore(column.maxPoints) }})
            </th>
            <th class="col-total">Total Nilai</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(student, index) in students"
            :key="student.key"
          >
            <td class="col-no">{{ index + 1 }}</td>
            <td class="col-number">{{ student.participantNumber ?? '-' }}</td>
            <td class="is-left">{{ student.name ?? '-' }}</td>
            <td
              v-for="column in typeColumns"
              :key="column.type"
              class="col-type"
            >
              {{ cellScore(student, column.type) }}
            </td>
            <td class="col-total font-bold">
              {{ formatTotalScore(student) }}
            </td>
          </tr>
          <tr v-if="students.length === 0">
            <td
              class="is-center"
              :colspan="4 + typeColumns.length"
            >
              Belum ada siswa yang menyelesaikan ujian ini.
            </td>
          </tr>
        </tbody>
      </table>

      <div class="sheet-signatures">
        <div class="sheet-signature">
          <p>Guru Mata Pelajaran</p>
          <div class="sheet-signature-space" />
          <p class="sheet-signature-name">{{ teacherName }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.print-sheet {
  font-family: 'Book Antiqua', 'Palatino Linotype', Palatino, serif;
  font-size: 11pt;
  line-height: 1.4;
  max-width: 100%;
}

.sheet-title {
  font-size: 13pt;
  font-weight: 700;
  text-transform: uppercase;
  text-align: center;
}

.sheet-subtitle {
  font-size: 11pt;
  font-weight: 700;
  text-transform: uppercase;
  text-align: center;
}

.sheet-meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6mm;
  font-size: 11pt;
}

.sheet-meta table {
  border-collapse: collapse;
}

.sheet-meta td {
  padding-block: 1px;
  vertical-align: top;
}

.sheet-meta .meta-left {
  min-width: 0;
}

.sheet-meta .meta-right {
  flex: none;
  white-space: nowrap;
}

.sheet-meta .sheet-label {
  white-space: nowrap;
}

.sheet-meta .sheet-colon {
  padding-inline: 2mm;
}

.sheet-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 10pt;
}

.sheet-table th,
.sheet-table td {
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  border: 0;
  border-right: 0.3mm solid currentColor;
  border-bottom: 0.3mm solid currentColor;
  padding: 3px 5px;
  text-align: center;
  vertical-align: middle;
  line-height: 1.3;
}

.sheet-table th {
  border-top: 0.3mm solid currentColor;
}

.sheet-table th:first-child,
.sheet-table td:first-child {
  border-left: 0.3mm solid currentColor;
}

.sheet-table .col-no {
  width: 9mm;
}

.sheet-table .col-number {
  width: 30mm;
  white-space: nowrap;
}

.sheet-table .col-type {
  white-space: nowrap;
}

.sheet-table .col-total {
  width: 24mm;
  white-space: nowrap;
}

.sheet-table .is-left {
  text-align: left;
}

.sheet-table .is-center {
  text-align: center;
}

.sheet-signatures {
  display: flex;
  justify-content: flex-end;
  padding-top: 3mm;
  break-inside: avoid;
}

.sheet-signature {
  width: 45%;
  text-align: center;
}

.sheet-signature-space {
  height: 16mm;
}

.sheet-signature-name {
  min-height: 1.4em;
  margin-top: 1mm;
}
</style>
