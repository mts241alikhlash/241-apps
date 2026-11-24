<script setup lang="ts">
import { computed } from 'vue'
import LetterheadKop from '@/features/exam-room/components/LetterheadKop.vue'
import { CARD_HEADER } from '@/features/exam-room/components/cardHeader'
import QuestionHtml from '@/features/exam-bank/components/QuestionHtml.vue'
import { answerText, formatScore } from '@/features/exam-grading/types'
import type { GradingItem } from '@/features/exam-grading/types'
import type { GradingSheetStudent } from './gradingSheet'

const props = defineProps<{
  subject: string
  classroom: string
  date: string
  timeRange: string
  teacher: string
  students: GradingSheetStudent[]
  stacked?: boolean
}>()

const maxOf = (items: GradingItem[]): number =>
  items.reduce((sum, item) => sum + item.points, 0)

const teacherName = computed(() =>
  props.teacher === '' ? '(.................................)' : props.teacher,
)

const answerOf = (item: GradingItem): string => answerText(item.answer).trim()

const shownAnswer = (item: GradingItem): string =>
  answerOf(item) === '' ? '-' : answerOf(item)
</script>

<template>
  <div
    :class="
      stacked
        ? 'space-y-6 break-after-page last:break-after-auto'
        : 'print-stack space-y-6'
    "
  >
    <section
      v-for="student in students"
      :key="student.key"
      class="print-room grading-sheet"
    >
      <div class="print-sheet space-y-1">
        <LetterheadKop />
        <div class="space-y-0.5">
          <p class="sheet-title">Lembar Pemeriksaan Jawaban Uraian</p>
          <p class="sheet-subtitle">{{ CARD_HEADER.title }}</p>
          <p class="sheet-subtitle">{{ CARD_HEADER.period }}</p>
        </div>

        <div class="sheet-meta">
          <table class="meta-left">
            <tbody>
              <tr>
                <td class="sheet-label">Nomor Peserta</td>
                <td class="sheet-colon">:</td>
                <td class="sheet-value">
                  {{ student.participantNumber ?? '-' }}
                </td>
              </tr>
              <tr>
                <td class="sheet-label">Nama Peserta</td>
                <td class="sheet-colon">:</td>
                <td class="sheet-value">{{ student.name ?? '-' }}</td>
              </tr>
              <tr>
                <td class="sheet-label">Kelas</td>
                <td class="sheet-colon">:</td>
                <td class="sheet-value">{{ classroom }}</td>
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
              <tr>
                <td class="sheet-label">Mata Pelajaran</td>
                <td class="sheet-colon">:</td>
                <td class="sheet-value">{{ subject }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <table class="sheet-table">
          <colgroup>
            <col class="col-no" />
            <col class="col-body" />
            <col class="col-score" />
          </colgroup>
          <thead>
            <tr>
              <th class="col-no">No</th>
              <th class="is-left">Soal dan Jawaban</th>
              <th class="col-score">Nilai</th>
            </tr>
          </thead>
          <tbody>
            <template
              v-for="item in student.items"
              :key="item.questionId"
            >
              <tr class="item-soal">
                <td class="col-no">{{ item.number }}</td>
                <td class="col-body">
                  <p class="item-label">Soal</p>
                  <QuestionHtml :html="item.bodyHtml" />
                </td>
                <td class="col-score" />
              </tr>
              <tr class="item-jawab">
                <td class="col-no" />
                <td class="col-body item-answer">
                  <p class="item-label">Jawaban</p>
                  <p>{{ shownAnswer(item) }}</p>
                </td>
                <td class="col-score">
                  <span class="score-line">………</span>
                  <span class="score-max"
                    >/ {{ formatScore(item.points) }}</span
                  >
                </td>
              </tr>
            </template>
            <tr v-if="student.items.length === 0">
              <td
                class="is-center"
                colspan="3"
              >
                Tidak ada soal uraian untuk diperiksa.
              </td>
            </tr>
            <tr>
              <td
                class="is-right"
                colspan="2"
              >
                Jumlah nilai uraian
              </td>
              <td class="col-score">
                <span class="score-line">………</span>
                <span class="score-max"
                  >/ {{ formatScore(maxOf(student.items)) }}</span
                >
              </td>
            </tr>
          </tbody>
        </table>

        <div class="sheet-signatures">
          <div class="sheet-signature">
            <p>Pemeriksa</p>
            <div class="sheet-signature-space" />
            <p class="sheet-signature-name">{{ teacherName }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
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

.sheet-meta .sheet-colon {
  padding-inline: 2mm;
}

.sheet-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
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
  text-align: left;
  vertical-align: top;
  line-height: 1.3;
}

.sheet-table th {
  border-top: 0.3mm solid currentColor;
}

.sheet-table th:first-child,
.sheet-table td:first-child {
  border-left: 0.3mm solid currentColor;
}

.sheet-table th {
  text-align: center;
}

.sheet-table .col-no {
  width: 9mm;
  text-align: center;
}

.sheet-table .col-score {
  width: 24mm;
  text-align: center;
  vertical-align: middle;
}

.sheet-table .is-center {
  text-align: center;
}

.sheet-table .is-left {
  text-align: left;
}

.sheet-table .is-right {
  text-align: right;
  font-weight: 700;
}

.item-soal {
  break-inside: avoid;
  break-after: avoid;
}

.item-soal td.col-no,
.item-soal td.col-score {
  border-bottom: 0;
}

.item-jawab td.col-body {
  white-space: pre-wrap;
}

.item-label {
  font-size: 9pt;
  font-weight: 700;
  font-style: italic;
}

.score-line {
  letter-spacing: 1px;
}

.score-max {
  font-size: 9pt;
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
