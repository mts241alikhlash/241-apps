<script setup lang="ts">
import { computed } from 'vue'
import LetterheadKop from '@/features/exam-room/components/LetterheadKop.vue'
import { CARD_HEADER } from '@/features/exam-room/components/cardHeader'

const ROWS_PER_PAGE = 26
const SINGLE_PAGE_MAX = 36

interface AttendanceStudent {
  studentId: string
  name: string | null
  classroomName: string | null
  participantNumber: string | null
}

interface PairRow {
  odd: AttendanceStudent
  oddNumber: number
  even: AttendanceStudent | null
  evenNumber: number
}

interface Sheet {
  students: AttendanceStudent[]
  isFirst: boolean
  showSignatures: boolean
  startNumber: number
}

const props = withDefaults(
  defineProps<{
    roomName: string
    date: string
    packages: string
    timeRange: string
    students: AttendanceStudent[]
    paginate?: boolean
    stacked?: boolean
    supervisorName?: string | null
    technicianName?: string | null
  }>(),
  {
    paginate: true,
    stacked: false,
    supervisorName: null,
    technicianName: null,
  },
)

const sheets = computed<Sheet[]>(() => {
  if (!props.paginate || props.students.length <= SINGLE_PAGE_MAX) {
    return [
      {
        students: props.students,
        isFirst: true,
        showSignatures: true,
        startNumber: 1,
      },
    ]
  }

  const chunks: AttendanceStudent[][] = []
  for (let start = 0; start < props.students.length; start += ROWS_PER_PAGE) {
    chunks.push(props.students.slice(start, start + ROWS_PER_PAGE))
  }
  if (chunks.length === 0) chunks.push([])
  if (chunks.length === 1) chunks.push([])

  return chunks.map((students, index) => ({
    students,
    isFirst: index === 0,
    showSignatures: index === chunks.length - 1,
    startNumber: index * ROWS_PER_PAGE + 1,
  }))
})

const pairsOf = (sheet: Sheet): PairRow[] => {
  const rows: PairRow[] = []
  for (let index = 0; index < sheet.students.length; index += 2) {
    const base = sheet.startNumber + index
    rows.push({
      odd: sheet.students[index],
      oddNumber: base,
      even: sheet.students[index + 1] ?? null,
      evenNumber: base + 1,
    })
  }
  return rows
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
    <section
      v-for="(sheet, sheetIndex) in sheets"
      :key="sheetIndex"
      class="print-room"
    >
      <div class="print-sheet space-y-1">
        <template v-if="sheet.isFirst">
          <LetterheadKop />
          <div class="space-y-0.5">
            <p class="sheet-title">Daftar Hadir Peserta</p>
            <p class="sheet-subtitle">{{ CARD_HEADER.title }}</p>
            <p class="sheet-subtitle">{{ CARD_HEADER.period }}</p>
          </div>

          <table class="sheet-meta">
            <colgroup>
              <col class="meta-label" />
              <col class="meta-colon" />
              <col class="meta-value" />
              <col class="meta-label-right" />
              <col class="meta-colon" />
              <col class="meta-value-right" />
            </colgroup>
            <tbody>
              <tr>
                <td class="sheet-label">Hari, Tanggal</td>
                <td class="sheet-colon">:</td>
                <td class="sheet-value">{{ date }}</td>
                <td class="sheet-label">Mata Pelajaran</td>
                <td class="sheet-colon">:</td>
                <td class="sheet-value">{{ packages }}</td>
              </tr>
              <tr>
                <td class="sheet-label">Jam Ke/Waktu</td>
                <td class="sheet-colon">:</td>
                <td class="sheet-value">{{ timeRange }}</td>
                <td class="sheet-label">Ruangan</td>
                <td class="sheet-colon">:</td>
                <td class="sheet-value">{{ roomName }}</td>
              </tr>
            </tbody>
          </table>
        </template>

        <table
          v-if="sheet.students.length > 0 || sheet.isFirst"
          class="sheet-table"
        >
          <colgroup>
            <col class="col-no" />
            <col class="col-number" />
            <col class="col-name" />
            <col class="col-class" />
            <col class="col-sign" />
            <col class="col-sign" />
          </colgroup>
          <thead>
            <tr>
              <th class="col-no">No</th>
              <th class="col-number is-center">Nomor Peserta</th>
              <th class="col-name is-left">Nama Peserta</th>
              <th class="col-class">Kelas</th>
              <th
                class="col-sign"
                colspan="2"
              >
                Tanda Tangan
              </th>
            </tr>
          </thead>
          <tbody>
            <template
              v-for="(pair, pairIndex) in pairsOf(sheet)"
              :key="pairIndex"
            >
              <tr>
                <td class="col-no text-center">
                  {{ pair.oddNumber }}
                </td>
                <td class="col-number is-center">
                  {{ pair.odd.participantNumber ?? '-' }}
                </td>
                <td class="col-name">{{ pair.odd.name ?? '-' }}</td>
                <td class="col-class is-center">
                  {{ pair.odd.classroomName ?? '-' }}
                </td>
                <td
                  class="sign-cell sign-left"
                  :rowspan="pair.even === null ? 1 : 2"
                >
                  {{ pair.oddNumber }}.
                </td>
                <td
                  class="sign-cell sign-right"
                  :rowspan="pair.even === null ? 1 : 2"
                >
                  {{ pair.evenNumber }}.
                </td>
              </tr>
              <tr v-if="pair.even !== null">
                <td class="col-no text-center">
                  {{ pair.evenNumber }}
                </td>
                <td class="col-number is-center">
                  {{ pair.even.participantNumber ?? '-' }}
                </td>
                <td class="col-name">{{ pair.even.name ?? '-' }}</td>
                <td class="col-class is-center">
                  {{ pair.even.classroomName ?? '-' }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>

        <div
          v-if="sheet.showSignatures"
          class="sheet-signatures"
        >
          <div class="sheet-signature">
            <p>Pengawas Ruangan</p>
            <div class="sheet-signature-space" />
            <p class="sheet-signature-name">{{ supervisorName ?? '' }}</p>
          </div>
          <div class="sheet-signature">
            <p>Teknisi Ruangan</p>
            <div class="sheet-signature-space" />
            <p class="sheet-signature-name">{{ technicianName ?? '' }}</p>
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
  width: 16%;
}

.sheet-meta .meta-colon {
  width: 2%;
}

.sheet-meta .meta-value {
  width: 50%;
}

.sheet-meta .meta-label-right {
  width: 15%;
}

.sheet-meta .meta-value-right {
  width: 15%;
}

.sheet-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 9pt;
}

.sheet-table th,
.sheet-table td {
  border: 1px solid currentColor;
  padding: 2px 3px;
  text-align: left;
  white-space: nowrap;
  line-height: 1.15;
}

.sheet-table th {
  text-align: center;
}

.sheet-table .col-no {
  width: 9mm;
  text-align: center;
}

.sheet-table .col-number {
  width: 24mm;
}

.sheet-table .col-name {
  width: 62mm;
}

.sheet-table .col-class {
  width: 20mm;
}

.sheet-table .col-sign {
  width: 27mm;
}

.sheet-table .is-center {
  text-align: center;
}

.sheet-table .is-left {
  text-align: left;
}

.sheet-table td.col-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.sign-cell {
  padding: 1px 4px 1px 3px;
}

.sign-left {
  vertical-align: top;
}

.sign-right {
  vertical-align: middle;
}

.sheet-signatures {
  display: flex;
  justify-content: space-between;
  gap: 10mm;
  padding-top: 3mm;
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
