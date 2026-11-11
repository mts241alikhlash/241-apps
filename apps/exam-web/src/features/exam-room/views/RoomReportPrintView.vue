<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BackButton } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Printer } from '@lucide/vue'
import { examRoomService } from '../services/examRoomService'
import type {
  Letterhead,
  RoomMonitorMeta,
  RoomMonitorParticipant,
  RoomReport,
} from '../types'
import { eventLabel, reasonLabel, reportStatusLabel } from '../types'

const route = useRoute()
const router = useRouter()

const roomId = computed(() => String(route.params.roomId ?? ''))
const slotId = computed(() => String(route.params.slotId ?? ''))

const report = ref<RoomReport | null>(null)
const letterhead = ref<Letterhead | null>(null)
const meta = ref<RoomMonitorMeta | null>(null)
const roster = ref<RoomMonitorParticipant[]>([])
const rosterTotal = ref(0)
const error = ref<string | null>(null)
const loading = ref(false)

const dateFormat = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'long',
})
const timeFormat = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
})
const dateTimeFormat = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const address = computed(() => letterhead.value?.address ?? '')

const schoolName = computed(() => letterhead.value?.name ?? '')

const rosterShort = computed(() => rosterTotal.value > roster.value.length)

const slotWindow = computed(() => {
  const slot = report.value?.slot
  if (!slot) return '-'
  return `${dateFormat.format(new Date(slot.startsAt))} · ${timeFormat.format(
    new Date(slot.startsAt),
  )}–${timeFormat.format(new Date(slot.endsAt))} WIB`
})

const totals = computed(() => {
  const rows = report.value?.schedules ?? []
  return rows.reduce(
    (sum, row) => ({
      registered: sum.registered + row.registeredCount,
      started: sum.started + row.startedCount,
      submitted: sum.submitted + row.submittedCount,
      absent: sum.absent + row.absentCount,
    }),
    { registered: 0, started: 0, submitted: 0, absent: 0 },
  )
})

const supervisorName = computed(
  () => meta.value?.room.currentSupervisorName ?? '......................',
)

const technicianName = computed(
  () => meta.value?.room.technicianName ?? '......................',
)

function print() {
  document.body.classList.add('printing-report')
  window.print()
  document.body.classList.remove('printing-report')
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const [reportResult, letterheadResult, rosterResult] = await Promise.all([
      examRoomService.loadReport(roomId.value, slotId.value),
      examRoomService.loadLetterhead(),
      examRoomService.loadRoster(roomId.value, slotId.value),
    ])
    letterhead.value = letterheadResult
    meta.value = rosterResult.meta
    rosterTotal.value = rosterResult.total
    roster.value = [...rosterResult.data].sort(
      (a, b) => a.seatNumber - b.seatNumber,
    )
    if (reportResult.success) {
      report.value = reportResult.data
    } else {
      report.value = null
      error.value = reportResult.error
    }
  } catch {
    report.value = null
    error.value = 'Dokumen tidak dapat dimuat. Periksa koneksi lalu coba lagi.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader variant="muted">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <BackButton
              label="Kembali ke Ruang Ujian"
              @click="router.push(`/exam/rooms/${roomId}`)"
            />
            <CardTitle class="font-semibold">Cetak Berita Acara</CardTitle>
          </div>
          <Button
            :disabled="loading || report === null"
            @click="print"
          >
            <Printer class="mr-1.5 size-4" />
            Cetak A4
          </Button>
        </div>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6 space-y-4"
      >
        <div
          v-if="error"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive"
          role="alert"
        >
          <p>{{ error }}</p>
          <Button
            class="mt-2"
            variant="outline"
            :disabled="loading"
            @click="load"
          >
            Coba lagi
          </Button>
        </div>

        <p
          v-else-if="loading"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Menyiapkan dokumen...
        </p>

        <div
          v-else-if="report"
          class="exam-report mx-auto max-w-[210mm] space-y-6 bg-white p-8 text-black"
        >
          <p
            v-if="rosterShort"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive"
            role="alert"
          >
            Daftar hadir memuat {{ roster.length }} dari
            {{ rosterTotal }} peserta. Cetak ulang setelah data termuat penuh.
          </p>
          <header class="border-b-2 border-black pb-3">
            <div class="text-center">
              <p class="text-[length:var(--text-control,0.75rem)] uppercase">
                Kementerian Agama Republik Indonesia
              </p>
              <p
                v-if="schoolName"
                class="text-base font-semibold uppercase"
              >
                {{ schoolName }}
              </p>
              <p
                v-if="address"
                class="text-[length:var(--text-control,0.75rem)]"
              >
                {{ address }}
              </p>
              <p
                v-if="letterhead?.nsm || letterhead?.npsn"
                class="text-[length:var(--text-control,0.75rem)] tabular-nums"
              >
                <span v-if="letterhead?.nsm">NSM {{ letterhead.nsm }}</span>
                <span v-if="letterhead?.npsn">
                  · NPSN {{ letterhead.npsn }}</span
                >
              </p>
            </div>
          </header>

          <div class="text-center">
            <h1 class="text-base font-semibold uppercase">
              Berita Acara Pelaksanaan Ujian
            </h1>
            <p class="text-[length:var(--text-control,0.75rem)] tabular-nums">
              {{ meta?.room.code }} · {{ meta?.room.name }} · {{ slotWindow }}
            </p>
            <p class="text-[length:var(--text-control,0.75rem)]">
              Status: {{ reportStatusLabel(report.status) }}
            </p>
          </div>

          <p class="text-[length:var(--text-control,0.75rem)] leading-relaxed">
            Pada hari ini, {{ slotWindow }}, telah dilaksanakan ujian di
            {{ meta?.room.name ?? 'ruangan ini' }}. Jumlah peserta terdaftar
            {{ totals.registered }} siswa, hadir {{ totals.started }} siswa,
            mengumpulkan {{ totals.submitted }} siswa, dan tidak hadir
            {{ totals.absent }} siswa.
          </p>

          <section class="space-y-2">
            <h2 class="text-[length:var(--text-control,0.75rem)] font-semibold">
              Rekap Kehadiran
            </h2>
            <table
              class="w-full border-collapse text-[length:var(--text-control,0.75rem)]"
            >
              <thead>
                <tr class="border-y border-black">
                  <th class="py-1 text-left">Mata Pelajaran</th>
                  <th class="py-1 text-left">Rombel</th>
                  <th class="py-1 text-center">Terdaftar</th>
                  <th class="py-1 text-center">Hadir</th>
                  <th class="py-1 text-center">Terkumpul</th>
                  <th class="py-1 text-center">Tidak Hadir</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in report.schedules"
                  :key="row.scheduleId"
                  class="border-b border-black/30"
                >
                  <td class="py-1">
                    {{ row.subjectName ?? row.packageTitle }}
                  </td>
                  <td class="py-1">{{ row.classroomName ?? '-' }}</td>
                  <td class="py-1 text-center tabular-nums">
                    {{ row.registeredCount }}
                  </td>
                  <td class="py-1 text-center tabular-nums">
                    {{ row.startedCount }}
                  </td>
                  <td class="py-1 text-center tabular-nums">
                    {{ row.submittedCount }}
                  </td>
                  <td class="py-1 text-center tabular-nums">
                    {{ row.absentCount }}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="space-y-2">
            <h2 class="text-[length:var(--text-control,0.75rem)] font-semibold">
              Daftar Hadir Peserta
            </h2>
            <table
              class="w-full border-collapse text-[length:var(--text-control,0.75rem)]"
            >
              <thead>
                <tr class="border-y border-black">
                  <th class="py-1 text-center">No</th>
                  <th class="py-1 text-center">Kursi</th>
                  <th class="py-1 text-left">Nama</th>
                  <th class="py-1 text-left">NIS</th>
                  <th class="py-1 text-left">Kelas</th>
                  <th class="py-1 text-left">Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in roster"
                  :key="`${row.studentId}-${row.scheduleId}`"
                  class="border-b border-black/30"
                >
                  <td class="py-1 text-center tabular-nums">
                    {{ index + 1 }}
                  </td>
                  <td class="py-1 text-center tabular-nums">
                    {{ row.seatNumber }}
                  </td>
                  <td class="py-1">{{ row.studentName ?? '-' }}</td>
                  <td class="py-1 tabular-nums">{{ row.nis ?? '-' }}</td>
                  <td class="py-1">{{ row.classroomName ?? '-' }}</td>
                  <td class="py-1">
                    {{
                      row.absence
                        ? `Tidak hadir: ${reasonLabel(row.absence.reason)}`
                        : row.session
                          ? 'Hadir'
                          : 'Belum mulai'
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="space-y-1">
            <h2 class="text-[length:var(--text-control,0.75rem)] font-semibold">
              Catatan Insiden &amp; Tindakan Teknis
            </h2>
            <p
              v-if="report.auditLogs.length === 0"
              class="text-[length:var(--text-control,0.75rem)]"
            >
              Tidak ada tindakan teknis pada jam ujian ini.
            </p>
            <ol
              v-else
              class="list-decimal space-y-1 pl-5 text-[length:var(--text-control,0.75rem)]"
            >
              <li
                v-for="entry in report.auditLogs"
                :key="entry.id"
                class="tabular-nums"
              >
                {{ dateTimeFormat.format(new Date(entry.createdAt)) }}:
                {{ eventLabel(entry.action) }}: {{ entry.reason }}
              </li>
            </ol>
            <div
              v-if="report.fieldNotes.length > 0"
              class="space-y-1"
            >
              <h3
                class="text-[length:var(--text-control,0.75rem)] font-semibold"
              >
                Catatan Pelanggaran Fisik
              </h3>
              <ol
                class="list-decimal space-y-1 pl-5 text-[length:var(--text-control,0.75rem)]"
              >
                <li
                  v-for="note in report.fieldNotes"
                  :key="note.id"
                  class="tabular-nums"
                >
                  {{ dateTimeFormat.format(new Date(note.recordedAt)) }}:
                  {{ note.studentName ?? 'Siswa' }} ({{ note.category }}):
                  {{ note.note }}
                </li>
              </ol>
            </div>
            <p
              v-if="report.incidentNotes"
              class="text-[length:var(--text-control,0.75rem)]"
            >
              Catatan pengawas: {{ report.incidentNotes }}
            </p>
          </section>

          <section
            class="flex justify-between gap-8 pt-6 text-[length:var(--text-control,0.75rem)]"
          >
            <div class="text-center">
              <p>Pengawas Ruangan</p>
              <div class="h-16" />
              <p class="border-t border-black pt-1">{{ supervisorName }}</p>
            </div>
            <div class="text-center">
              <p>Teknisi Ruangan</p>
              <div class="h-16" />
              <p class="border-t border-black pt-1">{{ technicianName }}</p>
            </div>
          </section>
        </div>
      </CardContent>
      <CardFooter variant="thin" />
    </Card>
  </div>
</template>
