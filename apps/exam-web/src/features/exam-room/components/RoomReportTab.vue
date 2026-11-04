<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mts241alikhlash/ui/alert-dialog'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@mts241alikhlash/ui/table'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { Printer } from '@lucide/vue'
import { examRoomService } from '../services/examRoomService'
import type {
  RoomExecutionCondition,
  RoomReport,
  RoomReportStatus,
} from '../types'
import {
  ROOM_EXECUTION_CONDITIONS,
  conditionLabel,
  eventLabel,
  reasonLabel,
  reportStatusLabel,
} from '../types'

const props = defineProps<{
  roomId: string
  slotId: string
  canVerify: boolean
  canSubmit: boolean
}>()

const router = useRouter()

const report = ref<RoomReport | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const saving = ref(false)
const submitting = ref(false)
const verifying = ref(false)
const reopening = ref(false)
const reopenOpen = ref(false)
const condition = ref<RoomExecutionCondition>('SMOOTH')
const incidentNotes = ref('')

const statusVariant = (status: RoomReportStatus) =>
  status === 'VERIFIED'
    ? 'default'
    : status === 'SUBMITTED'
      ? 'secondary'
      : 'outline'

const locked = computed(
  () => report.value !== null && report.value.status !== 'DRAFT',
)
const canSubmit = computed(
  () =>
    props.canSubmit && report.value !== null && report.value.status === 'DRAFT',
)
const canReopen = computed(
  () =>
    props.canVerify && report.value !== null && report.value.status !== 'DRAFT',
)

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

const timeFormat = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
})
const dateTimeFormat = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function apply(next: RoomReport) {
  report.value = next
  condition.value = next.condition
  incidentNotes.value = next.incidentNotes ?? ''
}

async function load() {
  if (props.roomId === '' || props.slotId === '') return
  loading.value = true
  const result = await examRoomService.loadReport(props.roomId, props.slotId)
  loading.value = false
  if (result.success) {
    apply(result.data)
    error.value = null
  } else {
    report.value = null
    error.value = result.error
  }
}

async function save() {
  if (locked.value || saving.value) return
  saving.value = true
  const result = await examRoomService.saveReport(props.roomId, props.slotId, {
    condition: condition.value,
    incidentNotes: incidentNotes.value.trim(),
  })
  saving.value = false
  if (result.success) apply(result.data)
  else error.value = result.error
}

async function submit() {
  if (submitting.value) return
  submitting.value = true
  const result = await examRoomService.submitReport(props.roomId, props.slotId)
  submitting.value = false
  if (result.success) apply(result.data)
  else error.value = result.error
}

async function verify() {
  if (verifying.value) return
  verifying.value = true
  const result = await examRoomService.verifyReport(props.roomId, props.slotId)
  verifying.value = false
  if (result.success) apply(result.data)
  else error.value = result.error
}

async function reopen() {
  if (reopening.value) return
  reopening.value = true
  const result = await examRoomService.saveReport(props.roomId, props.slotId, {
    reopen: true,
  })
  reopening.value = false
  reopenOpen.value = false
  if (result.success) apply(result.data)
  else error.value = result.error
}

function print() {
  void router.push(`/exam/rooms/${props.roomId}/reports/${props.slotId}/print`)
}

watch(
  () => [props.roomId, props.slotId],
  () => void load(),
  {
    immediate: true,
  },
)
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="error"
      class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive"
      role="alert"
    >
      {{ error }}
    </div>

    <p
      v-else-if="slotId === ''"
      class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
    >
      Pilih sesi pengawasan untuk membuka berita acara.
    </p>

    <p
      v-else-if="loading && report === null"
      class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
    >
      Memuat berita acara...
    </p>

    <template v-else-if="report">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <Badge :variant="statusVariant(report.status)">
            {{ reportStatusLabel(report.status) }}
          </Badge>
          <span
            class="tabular-nums text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            Sesi {{ timeFormat.format(new Date(report.slot.startsAt)) }}–{{
              timeFormat.format(new Date(report.slot.endsAt))
            }}
          </span>
          <span
            class="tabular-nums text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            Hadir {{ totals.started }} dari {{ totals.registered }} · Terkumpul
            {{ totals.submitted }} · Tidak hadir {{ totals.absent }}
          </span>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            variant="outline"
            @click="print"
          >
            <Printer class="mr-1.5 size-4" />
            Cetak Berita Acara &amp; Daftar Hadir
          </Button>
          <Button
            v-if="canReopen"
            variant="outline"
            :disabled="reopening"
            @click="reopenOpen = true"
          >
            Buka Kembali
          </Button>
          <Button
            v-if="canVerify && report.status === 'SUBMITTED'"
            :disabled="verifying"
            @click="verify"
          >
            Verifikasi
          </Button>
          <Button
            v-if="canSubmit"
            :disabled="submitting"
            @click="submit"
          >
            Serahkan Berita Acara
          </Button>
        </div>
      </div>

      <div class="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mata Pelajaran</TableHead>
              <TableHead>Rombel</TableHead>
              <TableHead class="text-center">Terdaftar</TableHead>
              <TableHead class="text-center">Hadir</TableHead>
              <TableHead class="text-center">Terkumpul</TableHead>
              <TableHead class="text-center">Tidak Hadir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="row in report.schedules"
              :key="row.scheduleId"
            >
              <TableCell>
                {{ row.subjectName ?? row.packageTitle }}
              </TableCell>
              <TableCell>{{ row.classroomName ?? '-' }}</TableCell>
              <TableCell class="text-center tabular-nums">
                {{ row.registeredCount }}
              </TableCell>
              <TableCell class="text-center tabular-nums">
                {{ row.startedCount }}
              </TableCell>
              <TableCell class="text-center tabular-nums">
                {{ row.submittedCount }}
              </TableCell>
              <TableCell class="text-center tabular-nums">
                {{ row.absentCount }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-2">
          <h3 class="text-[length:var(--text-control,0.75rem)] font-medium">
            Ketidakhadiran
          </h3>
          <p
            v-if="report.absences.length === 0"
            class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            Semua peserta hadir.
          </p>
          <ul
            v-else
            class="divide-y rounded-md border"
          >
            <li
              v-for="absence in report.absences"
              :key="absence.id"
              class="flex flex-wrap items-center gap-2 p-3 text-[length:var(--text-control,0.75rem)]"
            >
              <span>{{ absence.studentName ?? 'Siswa tidak ditemukan' }}</span>
              <span class="tabular-nums text-muted-foreground">
                {{ absence.nis ?? '-' }}
              </span>
              <Badge variant="destructive">
                {{ reasonLabel(absence.reason) }}
              </Badge>
              <span v-if="absence.note">{{ absence.note }}</span>
            </li>
          </ul>
        </div>

        <div class="space-y-2">
          <h3 class="text-[length:var(--text-control,0.75rem)] font-medium">
            Insiden &amp; Tindakan Teknis
          </h3>
          <p
            v-if="report.auditLogs.length === 0"
            class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            Tidak ada tindakan teknis pada jam ujian ini.
          </p>
          <ul
            v-else
            class="divide-y rounded-md border"
          >
            <li
              v-for="entry in report.auditLogs"
              :key="entry.id"
              class="flex flex-wrap items-center gap-2 p-3 text-[length:var(--text-control,0.75rem)]"
            >
              <span>{{ eventLabel(entry.action) }}</span>
              <span class="tabular-nums text-muted-foreground">
                {{ dateTimeFormat.format(new Date(entry.createdAt)) }}
              </span>
              <span class="text-muted-foreground">{{ entry.reason }}</span>
            </li>
          </ul>
          <h3
            class="pt-2 text-[length:var(--text-control,0.75rem)] font-medium"
          >
            Catatan Pelanggaran Fisik
          </h3>
          <p
            v-if="report.fieldNotes.length === 0"
            class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            Belum ada pelanggaran fisik yang dicatat.
          </p>
          <ul
            v-else
            class="divide-y rounded-md border"
          >
            <li
              v-for="note in report.fieldNotes"
              :key="note.id"
              class="flex flex-wrap items-center gap-2 p-3 text-[length:var(--text-control,0.75rem)]"
            >
              <span>{{ note.studentName ?? 'Siswa' }}</span>
              <Badge variant="outline">{{ note.category }}</Badge>
              <span>{{ note.note }}</span>
              <span class="tabular-nums text-muted-foreground">
                {{ dateTimeFormat.format(new Date(note.recordedAt)) }}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <FloatingLabelField
          label="Kondisi pelaksanaan"
          :for="'report-condition'"
          floating
        >
          <Select
            v-model="condition"
            :disabled="locked"
          >
            <SelectTrigger
              id="report-condition"
              class="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in ROOM_EXECUTION_CONDITIONS"
                :key="option"
                :value="option"
              >
                {{ conditionLabel(option) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>
        <div class="sm:col-span-2">
          <FloatingLabelField
            label="Catatan insiden ruangan"
            :for="'report-notes'"
            floating
          >
            <Textarea
              id="report-notes"
              v-model="incidentNotes"
              :disabled="locked"
              maxlength="2000"
              rows="3"
            />
          </FloatingLabelField>
        </div>
      </div>

      <AlertDialog
        :open="reopenOpen"
        @update:open="(value: boolean) => value || (reopenOpen = false)"
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buka kembali berita acara?</AlertDialogTitle>
            <AlertDialogDescription>
              Berita acara yang sudah diserahkan akan dapat diubah lagi dan
              tercatat pada riwayat audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel :disabled="reopening">Batal</AlertDialogCancel>
            <AlertDialogAction
              :disabled="reopening"
              @click.prevent="reopen"
            >
              {{ reopening ? 'Membuka...' : 'Buka Kembali' }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div
        v-if="!locked"
        class="flex justify-end"
      >
        <Button
          variant="outline"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Menyimpan...' : 'Simpan Draf' }}
        </Button>
      </div>
    </template>
  </div>
</template>
