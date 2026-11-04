import type { ColumnDef } from '@tanstack/vue-table'
import type { ExamScore } from '../types'

const dateFormat = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const studentText = (row: ExamScore) =>
  [row.studentName ?? 'Siswa', row.studentNis].filter(Boolean).join(' · ')
const classroomText = (row: ExamScore) => row.classroomName ?? '-'
const rawText = (row: ExamScore) => `${row.rawScore} / ${row.maxScore}`
const scoreText = (row: ExamScore) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(row.score)
const dateText = (row: ExamScore) => dateFormat.format(new Date(row.gradedAt))

export function buildScoreColumns(): ColumnDef<ExamScore>[] {
  return [
    {
      id: 'student',
      header: 'Siswa',
      meta: { align: 'left', strong: true },
      cell: ({ row }) => studentText(row.original),
    },
    {
      id: 'exam',
      header: 'Ujian',
      meta: {
        mobileLabel: 'Ujian',
        mobileValue: (row: ExamScore) => row.examTitle,
      },
      cell: ({ row }) => row.original.examTitle,
    },
    {
      id: 'classroom',
      header: 'Kelas',
      meta: { mobileLabel: 'Kelas', mobileValue: classroomText },
      cell: ({ row }) => classroomText(row.original),
    },
    {
      id: 'raw',
      header: 'Poin',
      meta: { align: 'center', mobileLabel: 'Poin', mobileValue: rawText },
      cell: ({ row }) => rawText(row.original),
    },
    {
      id: 'score',
      header: 'Nilai',
      meta: { align: 'center', mobileLabel: 'Nilai', mobileValue: scoreText },
      cell: ({ row }) => scoreText(row.original),
    },
    {
      id: 'date',
      header: 'Dinilai',
      meta: { align: 'center', mobileLabel: 'Dinilai', mobileValue: dateText },
      cell: ({ row }) => dateText(row.original),
    },
  ]
}
