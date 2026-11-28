import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Input } from '@mts241alikhlash/ui/input'
import {
  formatDay,
  formatTime,
} from '@/features/exam-schedule/utils/formatWindow'
import type { RowDraft, RowState } from '../composables/useOfflineScoreEntry'
import {
  PUBLICATION_LABELS,
  SCORE_STATE_LABELS,
  offlineKindLabel,
  type OfflineRosterRow,
  type OfflineSchedule,
} from '../types'

type Count = 'scored' | 'absent' | 'missing' | 'published'

const COUNT_HEADERS: Record<Count, string> = {
  scored: 'Dinilai',
  absent: 'Tidak hadir',
  missing: 'Belum dinilai',
  published: 'Terkirim',
}

const subjectText = (row: OfflineSchedule) => row.subjectName ?? '-'
const classroomText = (row: OfflineSchedule) => row.classroomName ?? '-'
const kindText = (row: OfflineSchedule) => offlineKindLabel(row.offlineKind)

const textColumn = (
  id: string,
  header: string,
  read: (row: OfflineSchedule) => string,
): ColumnDef<OfflineSchedule> => ({
  id,
  header,
  meta: { align: 'center', mobileLabel: header, mobileValue: read },
  cell: ({ row }) => read(row.original),
})

export function buildOfflineScheduleColumns(options: {
  onOpen: (schedule: OfflineSchedule) => void
}): ColumnDef<OfflineSchedule>[] {
  return [
    {
      id: 'subject',
      header: 'Mata Pelajaran',
      meta: { align: 'left', strong: true, mobile: 'title' },
      cell: ({ row }) => subjectText(row.original),
    },
    textColumn('classroom', 'Kelas', classroomText),
    textColumn('kind', 'Jenis', kindText),
    textColumn('date', 'Tanggal', (row) => formatDay(row.startsAt)),
    textColumn('start', 'Mulai', (row) => formatTime(row.startsAt)),
    textColumn('end', 'Selesai', (row) => formatTime(row.endsAt)),
    textColumn('maxScore', 'Maksimum', (row) => String(row.maxScore)),
    ...(Object.keys(COUNT_HEADERS) as Count[]).map((key) =>
      textColumn(key, COUNT_HEADERS[key], (row) => String(row[key])),
    ),
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      meta: { align: 'center' },
      cell: ({ row }) =>
        h(ActionCell, {
          viewLabel: 'Buka',
          hideEdit: true,
          hideDelete: true,
          onView: () => options.onOpen(row.original),
        }),
    },
  ]
}

export interface EntryColumnOptions {
  drafts: Record<string, RowDraft>
  rowStates: Record<string, RowState>
  canWrite: boolean
  onScore: (studentId: string, text: string) => void
  onNote: (studentId: string, text: string) => void
  onCommit: (studentId: string) => void
  onScoreKeydown: (studentId: string, event: KeyboardEvent) => void
  onPaste: (studentId: string, event: ClipboardEvent) => void
}

const SAVE_LABELS: Partial<Record<RowState['status'], string>> = {
  saving: 'Menyimpan…',
  saved: 'Tersimpan',
  error: 'Gagal disimpan',
}

const nameText = (row: OfflineRosterRow) => row.name ?? 'Siswa tidak ditemukan'
const numberText = (row: OfflineRosterRow) => row.participantNumber ?? '-'
const absent = (row: OfflineRosterRow) => row.state === 'ABSENT'
const muted = (row: OfflineRosterRow, text: string) =>
  h('span', { class: absent(row) ? 'text-muted-foreground' : undefined }, text)

export const stateText = (row: OfflineRosterRow) =>
  row.publication === null
    ? SCORE_STATE_LABELS[row.state]
    : `${SCORE_STATE_LABELS[row.state]} · ${PUBLICATION_LABELS[row.publication]}`

export function buildOfflineEntryColumns(
  options: EntryColumnOptions,
): ColumnDef<OfflineRosterRow>[] {
  const stateOf = (row: OfflineRosterRow) =>
    options.rowStates[row.studentId] ?? { status: 'idle', message: null }
  const draftOf = (row: OfflineRosterRow) =>
    options.drafts[row.studentId] ?? { score: '', note: '' }
  const locked = (row: OfflineRosterRow) => !options.canWrite || absent(row)

  return [
    {
      id: 'participantNumber',
      header: 'No. Peserta',
      meta: {
        align: 'center',
        mobileLabel: 'No. Peserta',
        mobileValue: numberText,
      },
      cell: ({ row }) => muted(row.original, numberText(row.original)),
    },
    {
      id: 'name',
      header: 'Nama',
      meta: { align: 'left', strong: true, mobile: 'title' },
      cell: ({ row }) => muted(row.original, nameText(row.original)),
    },
    {
      id: 'score',
      header: 'Nilai',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const student = row.original
        const state = stateOf(student)
        const flagged = state.status === 'invalid' || state.status === 'error'
        return h('div', { class: 'flex flex-col items-center gap-0.5' }, [
          h(Input, {
            modelValue: draftOf(student).score,
            type: 'text',
            inputmode: 'decimal',
            autocomplete: 'off',
            disabled: locked(student),
            'data-score-input': student.studentId,
            'aria-label': `Nilai ${nameText(student)}`,
            'aria-invalid': state.status === 'invalid' ? 'true' : undefined,
            class: 'h-[var(--control-h-sm,1.5rem)] w-16 text-center',
            'onUpdate:modelValue': (value: string | number) =>
              options.onScore(student.studentId, String(value)),
            onBlur: () => options.onCommit(student.studentId),
            onKeydown: (event: KeyboardEvent) =>
              options.onScoreKeydown(student.studentId, event),
            onPaste: (event: ClipboardEvent) =>
              options.onPaste(student.studentId, event),
          }),
          flagged && state.message
            ? h(
                'p',
                { class: 'whitespace-normal text-control text-destructive' },
                state.message,
              )
            : null,
        ])
      },
    },
    {
      id: 'note',
      header: 'Catatan',
      meta: { align: 'left' },
      cell: ({ row }) =>
        h(Input, {
          modelValue: draftOf(row.original).note,
          type: 'text',
          maxlength: 300,
          autocomplete: 'off',
          disabled: locked(row.original),
          'aria-label': `Catatan ${nameText(row.original)}`,
          class: 'h-[var(--control-h-sm,1.5rem)] min-w-40',
          'onUpdate:modelValue': (value: string | number) =>
            options.onNote(row.original.studentId, String(value)),
          onBlur: () => options.onCommit(row.original.studentId),
          onKeydown: (event: KeyboardEvent) => {
            if (event.key === 'Enter') options.onCommit(row.original.studentId)
          },
        }),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const save = SAVE_LABELS[stateOf(row.original).status]
        return h('div', { 'data-test': 'row-status', class: 'flex flex-col' }, [
          muted(row.original, stateText(row.original)),
          save
            ? h(
                'span',
                {
                  class:
                    stateOf(row.original).status === 'error'
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                },
                save,
              )
            : null,
        ])
      },
    },
  ]
}
