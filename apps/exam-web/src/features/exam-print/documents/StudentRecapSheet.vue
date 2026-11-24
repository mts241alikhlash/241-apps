<script setup lang="ts">
import LetterheadKop from '@/features/exam-room/components/LetterheadKop.vue'
import { CARD_HEADER } from '@/features/exam-room/components/cardHeader'
import QuestionHtml from '@/features/exam-bank/components/QuestionHtml.vue'
import {
  answerText,
  chosenKeys,
  formatScore,
  itemTypeLabel,
  type GradingItem,
} from '@/features/exam-grading/types'
import type { GradingSheetStudent } from './gradingSheet'

defineProps<{
  subject: string
  classroom: string
  date: string
  timeRange: string
  students: GradingSheetStudent[]
  stacked?: boolean
}>()

const TF_OPTIONS = [
  { value: true, label: 'Benar' },
  { value: false, label: 'Salah' },
] as const

const maxOf = (items: GradingItem[]): number =>
  items.reduce((sum, item) => sum + item.points, 0)

const totalScoreOf = (student: GradingSheetStudent): number | null => {
  if (student.rawScore !== undefined) return student.rawScore
  const scored = student.items.some((item) => item.score !== null)
  if (!scored) return null
  return student.items.reduce((sum, item) => sum + (item.score ?? 0), 0)
}

const maxScoreOf = (student: GradingSheetStudent): number =>
  student.maxScore ?? maxOf(student.items)

const headerScoreLabel = (student: GradingSheetStudent): string => {
  const total = totalScoreOf(student)
  const max = maxScoreOf(student)
  return `${total === null ? '-' : formatScore(total)} / ${formatScore(max)}`
}

const itemScoreLabel = (item: GradingItem): string =>
  `${item.score === null ? '-' : formatScore(item.score)} / ${formatScore(item.points)}`

const isChosenChoice = (item: GradingItem, key: string): boolean =>
  chosenKeys(item.answer).includes(key)

const isCorrectChoice = (item: GradingItem, key: string): boolean =>
  (item.correctKeys ?? []).includes(key)

const acceptedTextOf = (item: GradingItem): string => {
  const list = (item.acceptedAnswers ?? []).filter((text) => text.trim() !== '')
  return list.join(' / ') || '-'
}

const writtenAnswerOf = (item: GradingItem): string =>
  answerText(item.answer).trim() || '-'

const hasTrueFalseAnswer = (item: GradingItem): boolean =>
  typeof item.answer?.value === 'boolean'
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
      class="print-room student-recap-sheet"
    >
      <div class="print-sheet space-y-1">
        <LetterheadKop />
        <div class="space-y-0.5">
          <p class="sheet-title">Rekap Soal dan Jawaban Siswa</p>
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
              <th class="is-left">Soal dan Jawaban Siswa</th>
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
                  <div class="item-head">
                    <span class="item-label">Soal</span>
                    <span class="item-type">{{
                      itemTypeLabel(item.type)
                    }}</span>
                  </div>
                  <QuestionHtml :html="item.bodyHtml" />
                </td>
                <td class="col-score">{{ itemScoreLabel(item) }}</td>
              </tr>
              <tr class="item-jawab">
                <td class="col-no" />
                <td class="col-body">
                  <template v-if="item.choices && item.choices.length > 0">
                    <div class="item-head">
                      <span class="item-label">Pilihan</span>
                      <span
                        v-if="chosenKeys(item.answer).length === 0"
                        class="item-note"
                      >
                        Tidak dijawab
                      </span>
                    </div>
                    <div class="choice-list">
                      <div
                        v-for="choice in item.choices"
                        :key="choice.key"
                        class="choice-item"
                        :class="{
                          'is-correct': isCorrectChoice(item, choice.key),
                        }"
                      >
                        <span class="choice-key">{{ choice.key }}.</span>
                        <div class="choice-text">
                          <QuestionHtml :html="choice.html" />
                        </div>
                        <span class="choice-flags">
                          <span
                            v-if="isChosenChoice(item, choice.key)"
                            class="choice-picked"
                          >
                            Dipilih
                          </span>
                          <span
                            v-if="isCorrectChoice(item, choice.key)"
                            class="choice-mark"
                          >
                            ✓
                          </span>
                        </span>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="item.type === 'TRUE_FALSE'">
                    <div class="item-head">
                      <span class="item-label">Pilihan</span>
                      <span
                        v-if="!hasTrueFalseAnswer(item)"
                        class="item-note"
                      >
                        Tidak dijawab
                      </span>
                    </div>
                    <div class="tf-list">
                      <span
                        v-for="opt in TF_OPTIONS"
                        :key="String(opt.value)"
                        class="tf-option"
                        :class="{
                          'is-correct': item.correctValue === opt.value,
                        }"
                      >
                        <span>{{ opt.label }}</span>
                        <span
                          v-if="item.answer?.value === opt.value"
                          class="choice-picked"
                        >
                          Dipilih
                        </span>
                        <span
                          v-if="item.correctValue === opt.value"
                          class="choice-mark"
                        >
                          ✓
                        </span>
                      </span>
                    </div>
                  </template>

                  <template v-else-if="item.type === 'SHORT_ANSWER'">
                    <p class="item-label">Jawaban Siswa</p>
                    <p>{{ writtenAnswerOf(item) }}</p>
                    <p class="item-label mt-1">Kunci Jawaban</p>
                    <p>{{ acceptedTextOf(item) }}</p>
                  </template>

                  <template v-else>
                    <p class="item-label">Jawaban Siswa</p>
                    <p>{{ writtenAnswerOf(item) }}</p>
                    <template v-if="item.guideHtml?.trim()">
                      <p class="item-label mt-1">Pedoman Penilaian</p>
                      <QuestionHtml :html="item.guideHtml" />
                    </template>
                    <template v-if="item.note?.trim()">
                      <p class="item-label mt-1">Catatan Pemeriksa</p>
                      <p>{{ item.note }}</p>
                    </template>
                  </template>
                </td>
                <td class="col-score" />
              </tr>
            </template>
            <tr v-if="student.items.length === 0">
              <td
                class="is-center"
                colspan="3"
              >
                Belum ada soal pada sesi ini.
              </td>
            </tr>
            <tr>
              <td
                class="is-right font-bold"
                colspan="2"
              >
                Total Nilai
              </td>
              <td class="col-score font-bold">
                {{ headerScoreLabel(student) }}
              </td>
            </tr>
          </tbody>
        </table>
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
  text-align: center;
}

.sheet-table th:first-child,
.sheet-table td:first-child {
  border-left: 0.3mm solid currentColor;
}

.sheet-table .col-no {
  width: 9mm;
  text-align: center;
}

.sheet-table .col-score {
  width: 24mm;
  text-align: center;
  white-space: nowrap;
}

.sheet-table .is-center {
  text-align: center;
}

.sheet-table .is-left {
  text-align: left;
}

.sheet-table .is-right {
  text-align: right;
}

.item-soal {
  break-inside: avoid;
  break-after: avoid;
}

.item-jawab {
  break-inside: avoid;
}

.item-soal td.col-no,
.item-soal td.col-score {
  border-bottom: 0;
}

.item-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.item-label {
  font-size: 9pt;
  font-weight: 700;
  font-style: italic;
}

.item-type {
  font-size: 8.5pt;
}

.item-note {
  font-size: 8.5pt;
  font-style: italic;
}

.col-body :deep(.question-html) {
  font-size: inherit;
  line-height: inherit;
}

.col-body :deep(.question-html > :first-child) {
  margin-top: 0;
}

.col-body :deep(.question-html > :last-child) {
  margin-bottom: 0;
}

.choice-list {
  margin-top: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.choice-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.choice-item.is-correct {
  font-weight: 700;
}

.choice-key {
  flex: none;
  min-width: 14px;
}

.choice-text {
  flex: 0 1 auto;
  min-width: 0;
}

.choice-text :deep(.question-html p) {
  margin: 0;
}

.choice-flags {
  margin-left: auto;
  padding-left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.choice-picked {
  border: 0.25mm solid currentColor;
  padding: 0 4px;
  font-size: 8pt;
  font-weight: 700;
  line-height: 1.3;
}

.choice-mark {
  flex: none;
  font-weight: 700;
}

.tf-list {
  margin-top: 2px;
  display: flex;
  gap: 16px;
}

.tf-option {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.tf-option.is-correct {
  font-weight: 700;
}
</style>
