<script setup lang="ts">
import LetterheadKop from '@/features/exam-room/components/LetterheadKop.vue'
import { CARD_HEADER } from '@/features/exam-room/components/cardHeader'
import { formatPrintTime } from '../format'
import type { ScoreSheetStudent } from './scoreSheet'

withDefaults(
  defineProps<{
    subject: string
    classroom: string
    kind: string
    maxScore: number
    date: string
    startsAt: string
    endsAt: string
    students: ScoreSheetStudent[]
    stacked?: boolean
  }>(),
  { stacked: false },
)
</script>

<template>
  <div :class="stacked ? 'space-y-6' : 'print-stack space-y-6'">
    <section class="print-room score-sheet">
      <div class="print-sheet space-y-1">
        <div class="sheet-head space-y-1">
          <LetterheadKop />
          <div class="space-y-0.5">
            <p class="sheet-title">Score Sheet</p>
            <p class="sheet-subtitle">{{ CARD_HEADER.title }}</p>
            <p class="sheet-subtitle">{{ CARD_HEADER.period }}</p>
          </div>

          <table class="sheet-meta">
            <colgroup>
              <col class="meta-label" />
              <col class="meta-colon" />
              <col class="meta-value" />
              <col class="meta-label" />
              <col class="meta-colon" />
              <col class="meta-value" />
            </colgroup>
            <tbody>
              <tr>
                <td>Mata Pelajaran</td>
                <td>:</td>
                <td>{{ subject }}</td>
                <td>Hari, Tanggal</td>
                <td>:</td>
                <td>{{ date }}</td>
              </tr>
              <tr>
                <td>Kelas</td>
                <td>:</td>
                <td>{{ classroom }}</td>
                <td>Mulai</td>
                <td>:</td>
                <td>{{ formatPrintTime(startsAt) }}</td>
              </tr>
              <tr>
                <td>Jenis</td>
                <td>:</td>
                <td>Offline · {{ kind }}</td>
                <td>Selesai</td>
                <td>:</td>
                <td>{{ formatPrintTime(endsAt) }}</td>
              </tr>
              <tr>
                <td>Nilai Maksimal</td>
                <td>:</td>
                <td>{{ maxScore }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <table class="sheet-table">
          <colgroup>
            <col class="col-no" />
            <col class="col-number" />
            <col class="col-name" />
            <col class="col-score" />
            <col class="col-note" />
          </colgroup>
          <thead>
            <tr>
              <th>No</th>
              <th>No. Peserta</th>
              <th>Nama</th>
              <th>Score</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(student, index) in students"
              :key="student.studentId"
              :class="student.absent ? 'is-absent' : undefined"
            >
              <td class="is-center">{{ index + 1 }}</td>
              <td class="is-center">{{ student.participantNumber ?? '-' }}</td>
              <td class="col-name">{{ student.name ?? '-' }}</td>
              <td class="is-center">
                <span v-if="student.absent">TIDAK HADIR</span>
                <span
                  v-else
                  class="score-box"
                />
              </td>
              <td />
            </tr>
          </tbody>
        </table>

        <div class="sheet-signatures">
          <div class="sheet-signature">
            <p>Guru Mata Pelajaran</p>
            <div class="sheet-signature-space" />
            <p class="sheet-signature-name">
              (.................................)
            </p>
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
  overflow-x: hidden;
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
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 11pt;
}

.sheet-meta td {
  padding-block: 1px;
  vertical-align: top;
}

.sheet-meta .meta-label {
  width: 17%;
}

.sheet-meta .meta-colon {
  width: 2%;
}

.sheet-meta .meta-value {
  width: 31%;
}

.sheet-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  font-size: 10pt;
}

.sheet-table thead {
  display: table-header-group;
}

.sheet-table tr {
  break-inside: avoid;
}

.sheet-table th,
.sheet-table td {
  border: 0;
  border-right: 0.3mm solid currentColor;
  border-bottom: 0.3mm solid currentColor;
  padding: 3px 4px;
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
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
}

.sheet-table .col-number {
  width: 24mm;
}

.sheet-table .col-name {
  width: 66mm;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sheet-table .col-score {
  width: 26mm;
}

.sheet-table .is-center {
  text-align: center;
}

.sheet-table .is-absent td {
  color: #555;
}

.score-box {
  display: inline-block;
  width: 16mm;
  height: 6mm;
  border: 0.3mm solid currentColor;
  vertical-align: middle;
}

.sheet-signatures {
  display: flex;
  justify-content: flex-end;
  padding-top: 4mm;
  break-inside: avoid;
}

.sheet-signature {
  width: 45%;
  text-align: center;
}

.sheet-signature-space {
  height: 18mm;
}

.sheet-signature-name {
  min-height: 1.4em;
  margin-top: 1mm;
}
</style>
