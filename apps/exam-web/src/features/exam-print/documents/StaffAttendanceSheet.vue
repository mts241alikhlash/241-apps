<script setup lang="ts">
import { computed } from 'vue'
import LetterheadKop from '@/features/exam-room/components/LetterheadKop.vue'
import {
  CARD_HEADER,
  SCHOOL_SIGNERS,
} from '@/features/exam-room/components/cardHeader'

const SUPERVISORS_PER_PAGE = 20
const NAME_FULL_SIZE_CHARS = 30

interface SupervisorRow {
  key: string
  name: string | null
  roomName: string
  subject: string
  time: string
}

interface TechnicianRow {
  key: string
  name: string | null
  roomName: string
  time: string
}

interface SheetPage {
  kind: 'supervisors' | 'technicians'
  startNumber: number
  supervisors: SupervisorRow[]
  technicians: TechnicianRow[]
}

const props = withDefaults(
  defineProps<{
    date: string
    supervisors: SupervisorRow[]
    technicians: TechnicianRow[]
    stacked?: boolean
  }>(),
  { stacked: false },
)

const pages = computed<SheetPage[]>(() => {
  const chunks: SupervisorRow[][] = []
  for (
    let start = 0;
    start < props.supervisors.length;
    start += SUPERVISORS_PER_PAGE
  ) {
    chunks.push(props.supervisors.slice(start, start + SUPERVISORS_PER_PAGE))
  }
  if (chunks.length === 0) chunks.push([])

  const result: SheetPage[] = chunks.map((supervisors, index) => ({
    kind: 'supervisors',
    startNumber: index * SUPERVISORS_PER_PAGE + 1,
    supervisors,
    technicians: [],
  }))

  if (props.technicians.length > 0) {
    result.push({
      kind: 'technicians',
      startNumber: 1,
      supervisors: [],
      technicians: props.technicians,
    })
  }

  return result
})

const nameSize = (name: string | null): string => {
  const length = (name ?? 'Belum ditentukan').length
  const points =
    length <= NAME_FULL_SIZE_CHARS
      ? 10
      : Math.max(7.5, (10 * NAME_FULL_SIZE_CHARS) / length)
  return `${points.toFixed(1)}pt`
}

const pageTitle = (page: SheetPage): string =>
  page.kind === 'supervisors' ? 'Daftar Hadir Pengawas' : 'Daftar Hadir Teknisi'
</script>

<template>
  <div
    :class="
      stacked
        ? 'space-y-1 break-after-page last:break-after-auto'
        : 'print-stack space-y-1'
    "
  >
    <section
      v-for="(page, pageIndex) in pages"
      :key="pageIndex"
      class="print-room"
    >
      <div class="print-sheet space-y-1">
        <LetterheadKop />
        <div class="space-y-0.5">
          <p class="sheet-title">{{ pageTitle(page) }}</p>
          <p class="sheet-subtitle">{{ CARD_HEADER.title }}</p>
          <p class="sheet-subtitle">{{ CARD_HEADER.period }}</p>
        </div>

        <table class="sheet-meta">
          <tbody>
            <tr>
              <td class="sheet-label">Hari, Tanggal</td>
              <td class="sheet-colon">:</td>
              <td class="sheet-value">{{ date }}</td>
            </tr>
          </tbody>
        </table>

        <template v-if="page.kind === 'supervisors'">
          <table class="sheet-table">
            <colgroup>
              <col class="col-no" />
              <col class="col-name" />
              <col class="col-room" />
              <col class="col-subject" />
              <col class="col-time" />
              <col class="col-sign" />
            </colgroup>
            <thead>
              <tr>
                <th class="col-no">No</th>
                <th class="col-name">Nama Pengawas</th>
                <th class="col-room is-center">Ruang</th>
                <th class="col-subject is-center">Mata Pelajaran</th>
                <th class="col-time">Pukul</th>
                <th class="col-sign">Tanda Tangan</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in page.supervisors"
                :key="row.key"
              >
                <td class="col-no is-center">
                  {{ page.startNumber + index }}
                </td>
                <td
                  class="col-name"
                  :style="{ fontSize: nameSize(row.name) }"
                >
                  {{ row.name ?? 'Belum ditentukan' }}
                </td>
                <td class="col-room is-center">{{ row.roomName }}</td>
                <td class="col-subject is-center">{{ row.subject }}</td>
                <td class="col-time is-center">{{ row.time }}</td>
                <td class="col-sign" />
              </tr>
              <tr v-if="page.supervisors.length === 0">
                <td
                  colspan="6"
                  class="is-center"
                >
                  Belum ada pengawas pada hari ini.
                </td>
              </tr>
            </tbody>
          </table>
        </template>

        <template v-else>
          <table class="sheet-table">
            <colgroup>
              <col class="col-no" />
              <col class="col-name" />
              <col class="col-room" />
              <col class="col-time" />
              <col class="col-sign" />
            </colgroup>
            <thead>
              <tr>
                <th class="col-no">No</th>
                <th class="col-name">Nama Teknisi</th>
                <th class="col-room is-center">Ruang</th>
                <th class="col-time">Pukul</th>
                <th class="col-sign">Tanda Tangan</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in page.technicians"
                :key="row.key"
              >
                <td class="col-no is-center">
                  {{ page.startNumber + index }}
                </td>
                <td
                  class="col-name"
                  :style="{ fontSize: nameSize(row.name) }"
                >
                  {{ row.name ?? 'Belum ditentukan' }}
                </td>
                <td class="col-room is-center">{{ row.roomName }}</td>
                <td class="col-time is-center">{{ row.time }}</td>
                <td class="col-sign" />
              </tr>
            </tbody>
          </table>
        </template>

        <div class="sheet-signatures">
          <div class="sheet-signature">
            <p>Mengetahui,</p>
            <p>Kepala Madrasah</p>
            <div class="sheet-signature-space" />
            <p class="sheet-signature-name">{{ SCHOOL_SIGNERS.principal }}</p>
          </div>
          <div class="sheet-signature">
            <p class="sheet-signature-blank">&nbsp;</p>
            <p>Wakamad Kurikulum</p>
            <div class="sheet-signature-space" />
            <p class="sheet-signature-name">{{ SCHOOL_SIGNERS.curriculum }}</p>
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
  width: auto;
  border-collapse: collapse;
  font-size: 11pt;
}

.sheet-meta td {
  padding-block: 1px;
  vertical-align: top;
}

.sheet-label {
  width: 25mm;
}

.sheet-colon {
  width: 3mm;
}

.sheet-value {
  width: auto;
  padding-right: 4mm;
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
  border: 0;
  border-right: 0.3mm solid currentColor;
  border-bottom: 0.3mm solid currentColor;
  padding: 1px 4px;
  text-align: left;
  white-space: nowrap;
  line-height: 1.25;
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
  padding-block: 3px;
}

.sheet-table .col-no {
  width: 9mm;
}

.sheet-table .col-name {
  width: 58mm;
  overflow: hidden;
  white-space: nowrap;
}

.sheet-table .col-room {
  width: 20mm;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sheet-table .col-subject {
  width: 42mm;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sheet-table .col-time {
  width: 27mm;
  white-space: nowrap;
}

.sheet-table .col-sign {
  width: 30mm;
  height: 6.5mm;
}

.sheet-table .is-center {
  text-align: center;
}

.sheet-table .col-subject {
  white-space: normal;
  word-break: break-word;
}

.sheet-table .col-room {
  white-space: nowrap;
}

.sheet-signatures {
  display: flex;
  justify-content: space-between;
  gap: 10mm;
  padding-top: 6mm;
}

.sheet-signature {
  width: 45%;
  text-align: center;
}

.sheet-signature-space {
  height: 16mm;
}

.sheet-signature-name {
  font-weight: 700;
  white-space: nowrap;
}
</style>
