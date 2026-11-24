<script setup lang="ts">
import { computed } from 'vue'
import LetterheadKop from '@/features/exam-room/components/LetterheadKop.vue'
import { CARD_HEADER } from '@/features/exam-room/components/cardHeader'
import QuestionHtml from '@/features/exam-bank/components/QuestionHtml.vue'
import {
  typeLabel,
  type Choice,
  type ChoiceKey,
  type EssayContent,
  type MultipleChoiceContent,
  type MultipleResponseContent,
  type ShortAnswerContent,
  type TrueFalseContent,
} from '@/features/exam-bank/types'
import { formatScore } from '@/features/exam-grading/types'
import type { ExamPackagePrintItem } from '@/features/exam-package/types'

const props = defineProps<{
  subject: string
  grade: string
  packageTitle: string
  date: string
  timeRange: string
  items: ExamPackagePrintItem[]
  stacked?: boolean
}>()

const totalPoints = computed(() =>
  props.items.reduce((sum, item) => sum + item.points, 0),
)

const choicesOf = (item: ExamPackagePrintItem): Choice[] => {
  if (item.type === 'MULTIPLE_CHOICE' || item.type === 'MULTIPLE_RESPONSE') {
    return (item.content as MultipleChoiceContent | MultipleResponseContent)
      .choices
  }
  return []
}

const isCorrectChoice = (
  item: ExamPackagePrintItem,
  key: ChoiceKey,
): boolean => {
  if (item.resolution === 'BONUS_ALL') return false
  if (item.type === 'MULTIPLE_CHOICE') {
    return (item.content as MultipleChoiceContent).answer.key === key
  }
  if (item.type === 'MULTIPLE_RESPONSE') {
    return (item.content as MultipleResponseContent).answer.keys.includes(key)
  }
  return false
}

const trueFalseValue = (item: ExamPackagePrintItem): boolean | null => {
  if (item.resolution === 'BONUS_ALL' || item.type !== 'TRUE_FALSE') {
    return null
  }
  return (item.content as TrueFalseContent).answer.value
}

const shortAnswerText = (item: ExamPackagePrintItem): string => {
  const answer = (item.content as ShortAnswerContent).answer
  const accepted = answer.accepted.filter((text) => text.trim() !== '')
  const text = accepted.join(' / ') || '-'
  return answer.ignoreHarakat ? `${text} (abaikan harakat)` : text
}

const essayGuideOf = (item: ExamPackagePrintItem): string =>
  (item.content as EssayContent).guideHtml?.trim() ?? ''

const resolutionNote = (item: ExamPackagePrintItem): string => {
  if (item.resolution === 'BONUS_ALL') return 'Bonus (semua jawaban benar)'
  if (item.resolution === 'KEY_OVERRIDE') return 'Penyesuaian kunci'
  return ''
}
</script>

<template>
  <div
    :class="
      stacked
        ? 'space-y-6 break-after-page last:break-after-auto'
        : 'print-stack space-y-6'
    "
  >
    <section class="print-room question-key-sheet">
      <div class="print-sheet space-y-1">
        <LetterheadKop />
        <div class="space-y-0.5">
          <p class="sheet-title">Daftar Soal dan Kunci Jawaban</p>
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
                <td class="sheet-label">Tingkat</td>
                <td class="sheet-colon">:</td>
                <td class="sheet-value">{{ grade }}</td>
              </tr>
              <tr>
                <td class="sheet-label">Paket Soal</td>
                <td class="sheet-colon">:</td>
                <td class="sheet-value">{{ packageTitle }}</td>
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
                <td class="sheet-label">Jumlah Soal</td>
                <td class="sheet-colon">:</td>
                <td class="sheet-value">
                  {{ items.length }} soal · Total nilai
                  {{ formatScore(totalPoints) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <table class="sheet-table">
          <colgroup>
            <col class="col-no" />
            <col class="col-body" />
            <col class="col-points" />
          </colgroup>
          <thead>
            <tr>
              <th class="col-no">No</th>
              <th class="is-left">Soal dan Kunci</th>
              <th class="col-points">Nilai</th>
            </tr>
          </thead>
          <tbody>
            <template
              v-for="item in items"
              :key="item.questionId"
            >
              <tr class="item-soal">
                <td class="col-no">{{ item.position }}</td>
                <td class="col-body">
                  <div class="item-head">
                    <span class="item-label">Soal</span>
                    <span class="item-type">{{ typeLabel(item.type) }}</span>
                  </div>
                  <QuestionHtml :html="item.bodyHtml" />
                </td>
                <td class="col-points">{{ formatScore(item.points) }}</td>
              </tr>
              <tr class="item-jawab">
                <td class="col-no" />
                <td class="col-body">
                  <template v-if="choicesOf(item).length > 0">
                    <div class="item-head">
                      <span class="item-label">Pilihan</span>
                      <span
                        v-if="resolutionNote(item)"
                        class="item-note"
                      >
                        {{ resolutionNote(item) }}
                      </span>
                    </div>
                    <div class="choice-list">
                      <div
                        v-for="choice in choicesOf(item)"
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
                        <span
                          v-if="isCorrectChoice(item, choice.key)"
                          class="choice-mark"
                        >
                          ✓
                        </span>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="item.type === 'TRUE_FALSE'">
                    <div class="item-head">
                      <span class="item-label">Pilihan</span>
                      <span
                        v-if="resolutionNote(item)"
                        class="item-note"
                      >
                        {{ resolutionNote(item) }}
                      </span>
                    </div>
                    <div class="tf-list">
                      <span
                        class="tf-option"
                        :class="{ 'is-correct': trueFalseValue(item) === true }"
                      >
                        <span>Benar</span>
                        <span
                          v-if="trueFalseValue(item) === true"
                          class="choice-mark"
                        >
                          ✓
                        </span>
                      </span>
                      <span
                        class="tf-option"
                        :class="{
                          'is-correct': trueFalseValue(item) === false,
                        }"
                      >
                        <span>Salah</span>
                        <span
                          v-if="trueFalseValue(item) === false"
                          class="choice-mark"
                        >
                          ✓
                        </span>
                      </span>
                    </div>
                  </template>

                  <template v-else-if="item.type === 'SHORT_ANSWER'">
                    <div class="item-head">
                      <span class="item-label">Kunci Jawaban</span>
                      <span
                        v-if="resolutionNote(item)"
                        class="item-note"
                      >
                        {{ resolutionNote(item) }}
                      </span>
                    </div>
                    <p v-if="item.resolution === 'BONUS_ALL'">
                      Semua jawaban dianggap benar
                    </p>
                    <p v-else>{{ shortAnswerText(item) }}</p>
                  </template>

                  <template v-else>
                    <div class="item-head">
                      <span class="item-label">Pedoman Penilaian</span>
                      <span
                        v-if="resolutionNote(item)"
                        class="item-note"
                      >
                        {{ resolutionNote(item) }}
                      </span>
                    </div>
                    <p v-if="item.resolution === 'BONUS_ALL'">
                      Semua jawaban dianggap benar
                    </p>
                    <QuestionHtml
                      v-else-if="essayGuideOf(item)"
                      :html="essayGuideOf(item)"
                    />
                    <p v-else>-</p>
                  </template>
                </td>
                <td class="col-points" />
              </tr>
            </template>
            <tr v-if="items.length === 0">
              <td
                class="is-center"
                colspan="3"
              >
                Belum ada soal pada paket ini.
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

.sheet-table .col-points {
  width: 16mm;
  text-align: center;
}

.sheet-table .is-center {
  text-align: center;
}

.sheet-table .is-left {
  text-align: left;
}

.item-soal {
  break-inside: avoid;
  break-after: avoid;
}

.item-jawab {
  break-inside: avoid;
}

.item-soal td.col-no,
.item-soal td.col-points {
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

.choice-mark {
  flex: none;
  font-weight: 700;
}

.choice-item .choice-mark {
  margin-left: auto;
  padding-left: 8px;
}

.tf-list {
  margin-top: 2px;
  display: flex;
  gap: 16px;
}

.tf-option {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tf-option.is-correct {
  font-weight: 700;
}
</style>
