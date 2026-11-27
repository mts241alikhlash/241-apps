<script setup lang="ts">
import { h, nextTick, ref } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { toast } from 'vue-sonner'
import { ActionCell, DataTable, DataTableEmpty } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { useOfflineSchedules } from '@/features/exam-offline/composables/useOfflineSchedules'
import { examOfflineService } from '@/features/exam-offline/services/examOfflineService'
import {
  offlineKindLabel,
  type OfflineSchedule,
} from '@/features/exam-offline/types'
import {
  formatDay,
  formatTime,
} from '@/features/exam-schedule/utils/formatWindow'
import ScoreSheet from '../documents/ScoreSheet.vue'
import type { ScoreSheetStudent } from '../documents/scoreSheet'
import { formatPrintDate } from '../format'
import { waitForPrintImages } from '../printImages'

interface LoadedSheet {
  schedule: OfflineSchedule
  students: ScoreSheetStudent[]
}

const { schedules, loading, listError, refresh } = useOfflineSchedules()
const page = ref(1)
const pageSize = ref(25)
const printing = ref(false)
const printList = ref<LoadedSheet[]>([])

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Cetak Dokumen', href: '#' },
  { title: 'Score Sheet', href: '#' },
])

async function loadSheet(schedule: OfflineSchedule): Promise<LoadedSheet> {
  const roster = await examOfflineService.loadRoster(schedule.scheduleId)
  if (!roster.success) throw new Error(roster.error)
  return {
    schedule,
    students: roster.data.map((row) => ({
      studentId: row.studentId,
      participantNumber: row.participantNumber,
      name: row.name,
      absent: row.state === 'ABSENT',
    })),
  }
}

async function print(targets: OfflineSchedule[]) {
  if (printing.value || targets.length === 0) return
  printing.value = true
  try {
    const loaded: LoadedSheet[] = []
    for (const schedule of targets) loaded.push(await loadSheet(schedule))
    printList.value = loaded
    await nextTick()
    await waitForPrintImages()
    document.body.classList.add('printing-stack')
    window.print()
    document.body.classList.remove('printing-stack')
  } catch (err: unknown) {
    toast.error(
      err instanceof Error && err.message !== ''
        ? err.message
        : 'Gagal memuat daftar siswa.',
    )
  } finally {
    printList.value = []
    printing.value = false
  }
}

const text = (
  id: string,
  header: string,
  read: (row: OfflineSchedule) => string,
): ColumnDef<OfflineSchedule> => ({
  id,
  header,
  meta: { align: 'center', mobileLabel: header, mobileValue: read },
  cell: ({ row }) => read(row.original),
})

const columns: ColumnDef<OfflineSchedule>[] = [
  {
    id: 'subject',
    header: 'Mata Pelajaran',
    meta: { align: 'left', strong: true, mobile: 'title' },
    cell: ({ row }) => row.original.subjectName ?? '-',
  },
  text('classroom', 'Kelas', (row) => row.classroomName ?? '-'),
  text('kind', 'Jenis', (row) => offlineKindLabel(row.offlineKind)),
  text('date', 'Tanggal', (row) => formatDay(row.startsAt)),
  text('start', 'Mulai', (row) => formatTime(row.startsAt)),
  text('end', 'Selesai', (row) => formatTime(row.endsAt)),
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        viewLabel: 'Cetak',
        hideEdit: true,
        hideDelete: true,
        onView: () => void print([row.original]),
      }),
  },
]

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}
</script>

<template>
  <div class="print-body flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Score Sheet</CardTitle>
        <Button
          :disabled="loading || printing || schedules.length === 0"
          @click="print(schedules)"
        >
          {{ printing ? 'Menyiapkan…' : 'Cetak semua' }}
        </Button>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto pt-2 px-4 pb-4"
      >
        <div
          v-if="listError"
          class="space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-control">{{ listError }}</p>
          <Button
            variant="outline"
            @click="refresh()"
          >
            Coba lagi
          </Button>
        </div>
        <DataTable
          v-else
          mobile="cards"
          :columns="columns"
          :data="schedules"
          :page="page"
          :page-size="pageSize"
          :is-loading="loading"
          item-label="kelas"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #empty>
            <DataTableEmpty message="Belum ada ujian offline." />
          </template>
        </DataTable>
      </CardContent>
      <CardFooter plain />
    </Card>

    <div
      v-if="printList.length > 0"
      class="print-only"
    >
      <div class="print-stack">
        <ScoreSheet
          v-for="sheet in printList"
          :key="sheet.schedule.scheduleId"
          :subject="sheet.schedule.subjectName ?? '-'"
          :classroom="sheet.schedule.classroomName ?? '-'"
          :kind="offlineKindLabel(sheet.schedule.offlineKind)"
          :max-score="sheet.schedule.maxScore"
          :date="formatPrintDate(sheet.schedule.startsAt)"
          :starts-at="sheet.schedule.startsAt"
          :ends-at="sheet.schedule.endsAt"
          :students="sheet.students"
          stacked
        />
      </div>
    </div>
  </div>
</template>
