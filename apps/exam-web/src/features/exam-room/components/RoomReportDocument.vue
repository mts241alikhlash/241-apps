<script setup lang="ts">
import { computed } from 'vue'
import type { RoomReport } from '../types'
import LetterheadKop from './LetterheadKop.vue'
import { CARD_HEADER } from './cardHeader'
import { eventLabel } from '../types'
import { formatPrintTime } from '@/features/exam-print/format'

const props = defineProps<{
  report: RoomReport
  room: {
    name: string
    currentSupervisorName: string | null
    technicianName: string | null
  }
}>()

const dateTimeFormat = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const longDay = computed(() =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(
    new Date(props.report.slot.startsAt),
  ),
)

const longDate = computed(() =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
    new Date(props.report.slot.startsAt),
  ),
)

const numberWords = [
  'nol',
  'satu',
  'dua',
  'tiga',
  'empat',
  'lima',
  'enam',
  'tujuh',
  'delapan',
  'sembilan',
]

const spell = (n: number): string => {
  if (n < 10) return numberWords[n]
  if (n === 10) return 'sepuluh'
  if (n === 11) return 'sebelas'
  if (n < 20) return `${numberWords[n - 10]} belas`
  if (n < 100) {
    const rest = n % 10
    return `${numberWords[Math.floor(n / 10)]} puluh${rest ? ` ${numberWords[rest]}` : ''}`
  }
  if (n < 200) return `seratus${n > 100 ? ` ${spell(n - 100)}` : ''}`
  if (n < 1000) {
    const rest = n % 100
    return `${numberWords[Math.floor(n / 100)]} ratus${rest ? ` ${spell(rest)}` : ''}`
  }
  if (n < 2000) return `seribu${n > 1000 ? ` ${spell(n - 1000)}` : ''}`
  const rest = n % 1000
  return `${spell(Math.floor(n / 1000))} ribu${rest ? ` ${spell(rest)}` : ''}`
}

const capitalize = (text: string) =>
  text.replace(/\b[a-z]/g, (c) => c.toUpperCase())

const yearWord = computed(() =>
  capitalize(spell(new Date(props.report.slot.startsAt).getFullYear())),
)

const startClock = computed(() =>
  new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(props.report.slot.startsAt))
    .replace('.', ':'),
)

const endClock = computed(() =>
  new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(props.report.slot.endsAt))
    .replace('.', ':'),
)

const subjectsOf = (
  rows: RoomReport['schedules'],
  label: (row: RoomReport['schedules'][number], name: string) => string,
) =>
  [
    ...new Set(
      rows.flatMap((row) => {
        const name = row.subjectName ?? row.packageTitle
        return name === null ? [] : [label(row, name)]
      }),
    ),
  ].join(', ')

const offlineWords = { WRITTEN: 'tertulis', PRACTICAL: 'praktik' } as const

const onlineSubjects = computed(() =>
  subjectsOf(
    props.report.schedules.filter((row) => row.deliveryMode !== 'OFFLINE'),
    (_, name) => name,
  ),
)

const offlineSubjects = computed(() =>
  subjectsOf(
    props.report.schedules.filter((row) => row.deliveryMode === 'OFFLINE'),
    (row, name) =>
      row.offlineKind === null
        ? name
        : `${name} (${offlineWords[row.offlineKind]})`,
  ),
)

const kindLabels = { WRITTEN: 'Written', PRACTICAL: 'Practical' } as const

const lines = computed(() =>
  props.report.schedules.map((row, index) => ({
    key: row.scheduleId ?? row.activityId ?? String(index),
    title: row.packageTitle ?? row.subjectName ?? '-',
    offline: row.deliveryMode === 'OFFLINE',
    kind: row.offlineKind === null ? null : kindLabels[row.offlineKind],
    startsAt: formatPrintTime(row.startsAt),
    endsAt: formatPrintTime(row.endsAt),
    registered: row.registeredCount,
    present: row.registeredCount - row.absentCount,
    absent: row.absentCount,
    started: row.startedCount ?? '-',
    submitted: row.submittedCount ?? '-',
  })),
)

const registered = computed(() =>
  props.report.schedules.reduce((sum, row) => sum + row.registeredCount, 0),
)

const registeredWord = computed(() => spell(registered.value))
</script>

<template>
  <div
    class="exam-report mx-auto w-full min-w-0 max-w-[210mm] space-y-1 overflow-x-hidden bg-white text-black"
  >
    <LetterheadKop />

    <div class="report-heading">
      <p class="report-title">Berita Acara Pelaksanaan</p>
    </div>

    <div class="space-y-4">
      <p class="text-justify leading-relaxed">
        Pada hari ini, {{ longDay }}, tanggal {{ longDate }}, tahun
        {{ yearWord }}, telah dilaksanakan {{ CARD_HEADER.title }}
        {{ CARD_HEADER.period }} dari pukul {{ startClock }} sampai dengan pukul
        {{ endClock }} WIB di {{ CARD_HEADER.school }}.
      </p>

      <table class="w-max border-collapse">
        <tbody>
          <tr>
            <td class="pr-3 align-top">Ruang</td>
            <td class="pr-3 align-top">:</td>
            <td class="align-top">{{ room.name }}</td>
          </tr>
          <tr>
            <td class="pr-3 align-top">Jumlah peserta seharusnya</td>
            <td class="pr-3 align-top">:</td>
            <td class="align-top">
              {{ registered }} ({{ registeredWord }}) orang
            </td>
          </tr>
          <tr>
            <td class="pr-3 align-top">Jumlah peserta hadir</td>
            <td class="pr-3 align-top">:</td>
            <td class="align-top">
              <span class="blank" /> (<span class="blank blank-word" />) orang
            </td>
          </tr>
          <tr>
            <td class="pr-3 align-top">Jumlah peserta tidak hadir</td>
            <td class="pr-3 align-top">:</td>
            <td class="align-top">
              <span class="blank" /> (<span class="blank blank-word" />) orang
            </td>
          </tr>
        </tbody>
      </table>

      <table class="lines">
        <thead>
          <tr>
            <th>Mata Pelajaran</th>
            <th>Mulai</th>
            <th>Selesai</th>
            <th>Peserta</th>
            <th>Hadir</th>
            <th>Tidak Hadir</th>
            <th>Mengerjakan</th>
            <th>Menyerahkan</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="line in lines"
            :key="line.key"
            data-row
          >
            <td class="is-left">
              {{ line.title }}
              <span
                v-if="line.offline"
                class="mode"
              >
                Offline<template v-if="line.kind"> - {{ line.kind }}</template>
              </span>
            </td>
            <td data-cell="startsAt">{{ line.startsAt }}</td>
            <td data-cell="endsAt">{{ line.endsAt }}</td>
            <td data-cell="registered">{{ line.registered }}</td>
            <td data-cell="present">{{ line.present }}</td>
            <td data-cell="absent">{{ line.absent }}</td>
            <td data-cell="started">{{ line.started }}</td>
            <td data-cell="submitted">{{ line.submitted }}</td>
          </tr>
        </tbody>
      </table>

      <p
        v-if="onlineSubjects"
        class="text-justify leading-relaxed"
      >
        Ujian dilaksanakan menggunakan aplikasi ujian madrasah. Peserta
        mengerjakan ujian mata pelajaran {{ onlineSubjects }} melalui akun
        masing-masing dan mengumpulkan jawaban secara daring. Token ujian
        diumumkan oleh pengawas ruangan pada saat ujian dimulai.
      </p>
      <p
        v-if="offlineSubjects"
        class="text-justify leading-relaxed"
      >
        Ujian mata pelajaran {{ offlineSubjects }} dilaksanakan secara luring
        tanpa aplikasi.
      </p>

      <section class="space-y-1">
        <p>Catatan selama pelaksanaan {{ CARD_HEADER.title }}* :</p>
        <template v-if="report.auditLogs.length === 0 && !report.incidentNotes">
          <div
            v-for="line in 3"
            :key="line"
            class="note-line"
          />
        </template>
        <template v-else>
          <ol class="list-decimal space-y-1 pl-6">
            <li
              v-for="entry in report.auditLogs"
              :key="entry.id"
            >
              {{ dateTimeFormat.format(new Date(entry.createdAt)) }}:
              {{ eventLabel(entry.action) }} — {{ entry.reason }}
            </li>
            <li
              v-for="note in report.fieldNotes"
              :key="note.id"
            >
              {{ dateTimeFormat.format(new Date(note.recordedAt)) }}:
              {{ note.studentName ?? 'Siswa' }} ({{ note.category }}) —
              {{ note.note }}
            </li>
          </ol>
          <p
            v-if="report.incidentNotes"
            class="pl-4"
          >
            Catatan pengawas: {{ report.incidentNotes }}
          </p>
        </template>
      </section>

      <p class="leading-relaxed">
        Berita acara ini dibuat dengan sungguh-sungguh.
      </p>

      <section class="space-y-3 pt-4">
        <p class="text-right">Bandung, {{ longDate }}</p>
        <p class="text-center">Yang membuat berita acara:</p>
        <div class="flex justify-between gap-6">
          <div class="w-2/5 text-center">
            <p>Pengawas Ruangan</p>
            <div class="h-16" />
            <p class="pt-1">
              <span v-if="room.currentSupervisorName">{{
                room.currentSupervisorName
              }}</span>
              <span
                v-else
                class="blank-name"
              />
            </p>
          </div>
          <div class="w-2/5 text-center">
            <p>Teknisi Ruangan</p>
            <div class="h-16" />
            <p class="pt-1">
              <span v-if="room.technicianName">{{ room.technicianName }}</span>
              <span
                v-else
                class="blank-name"
              />
            </p>
          </div>
        </div>
      </section>

      <section class="space-y-1 pt-4">
        <p class="font-semibold">Keterangan:</p>
        <p>
          *: Diisi apabila terjadi hal-hal lain seperti kendala teknis,
          ketidakhadiran peserta, pelanggaran tata tertib, dan sebagainya.
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.exam-report {
  font-family: 'Book Antiqua', 'Palatino Linotype', Palatino, serif;
  font-size: 11pt;
  line-height: 1.4;
}

.note-line {
  border-bottom: 1px solid currentColor;
  height: 1.7em;
}

.lines {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
}

.lines th,
.lines td {
  border: 0.3mm solid currentColor;
  padding: 1mm 1.5mm;
  text-align: center;
}

.lines .is-left {
  text-align: left;
}

.mode {
  display: block;
  font-size: 8pt;
}

.blank {
  display: inline-block;
  min-width: 12mm;
  border-bottom: 1px solid currentColor;
}

.blank-word {
  min-width: 28mm;
}

.blank-name {
  display: block;
  min-height: 1.4em;
}

.report-heading {
  text-align: center;
  text-transform: uppercase;
}

.report-title {
  font-size: 13pt;
  font-weight: 700;
  text-decoration: underline;
}
</style>
