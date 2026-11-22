import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@mts241alikhlash/ui/tooltip'
import { Check, X } from '@lucide/vue'
import type { GradingItem } from '../types'
import { answerText, booleanLabel, chosenKeys, itemTypeLabel } from '../types'
import ScoreCell from './ScoreCell.vue'

const plain = (html: string): string =>
  (
    new DOMParser().parseFromString(html, 'text/html').body.textContent ?? ''
  ).trim()

const clip = (text: string, length: number): string =>
  text.length > length ? `${text.slice(0, length)}…` : text

const tip = (text: string, full: string, block = false) =>
  full === '' || (!block && full === text)
    ? text
    : h(Tooltip, { delayDuration: 200 }, () => [
        h(TooltipTrigger, { asChild: true }, () =>
          h(
            'span',
            { class: block ? 'block truncate' : 'cursor-default' },
            text,
          ),
        ),
        h(
          TooltipContent,
          { class: 'max-w-sm whitespace-pre-wrap break-words' },
          () => full,
        ),
      ])

const hasAnswer = (item: GradingItem): boolean =>
  item.answer !== null &&
  (!('text' in item.answer) || answerText(item.answer).trim() !== '')

function studentText(item: GradingItem): string {
  if (!hasAnswer(item)) return '-'
  if (item.type === 'TRUE_FALSE') return booleanLabel(item.answer?.value)
  if (item.choices) return chosenKeys(item.answer).join(', ') || '-'
  return clip(answerText(item.answer), 24)
}

function studentFull(item: GradingItem): string {
  if (!hasAnswer(item)) return ''
  if (item.type === 'TRUE_FALSE' || item.choices) return ''
  return answerText(item.answer)
}

function keyFull(item: GradingItem): string {
  if (item.type === 'TRUE_FALSE' || item.choices) return ''
  return (item.acceptedAnswers ?? []).join(', ')
}

function keyText(item: GradingItem): string {
  if (item.type === 'TRUE_FALSE') return booleanLabel(item.correctValue)
  if (item.choices) return (item.correctKeys ?? []).join(', ') || '-'
  if (item.acceptedAnswers && item.acceptedAnswers.length > 0) {
    return clip(item.acceptedAnswers.join(', '), 24)
  }
  return '-'
}

export interface GradingItemColumnOptions {
  sessionId: string
  canGrade: boolean
  onOpen: (item: GradingItem) => void
  onGraded: (item: GradingItem) => void
}

export function buildGradingItemColumns(
  options: GradingItemColumnOptions,
): ColumnDef<GradingItem>[] {
  return [
    {
      id: 'number',
      header: 'No',
      meta: {
        align: 'center',
        mobileLabel: 'No',
        mobileValue: (item: GradingItem) => String(item.number),
      },
      cell: ({ row }) => String(row.original.number),
    },
    {
      id: 'type',
      header: 'Jenis',
      meta: {
        align: 'center',
        mobileLabel: 'Jenis',
        mobileValue: (item: GradingItem) => itemTypeLabel(item.type),
      },
      cell: ({ row }) => itemTypeLabel(row.original.type),
    },
    {
      id: 'question',
      header: 'Soal',
      meta: {
        align: 'left',
        truncate: true,
        mobile: 'title',
        mobileValue: (item: GradingItem) => clip(plain(item.bodyHtml), 80),
      },
      cell: ({ row }) =>
        tip(
          plain(row.original.bodyHtml),
          clip(plain(row.original.bodyHtml), 600),
          true,
        ),
    },
    {
      id: 'answer',
      header: 'Jawaban Siswa',
      meta: {
        align: 'center',
        mobileLabel: 'Jawaban Siswa',
        mobileValue: studentText,
      },
      cell: ({ row }) =>
        tip(studentText(row.original), studentFull(row.original)),
    },
    {
      id: 'key',
      header: 'Kunci',
      meta: {
        align: 'center',
        mobileLabel: 'Kunci',
        mobileValue: keyText,
      },
      cell: ({ row }) => tip(keyText(row.original), keyFull(row.original)),
    },
    {
      id: 'result',
      header: 'Hasil',
      meta: {
        align: 'center',
        mobileLabel: 'Hasil',
      },
      cell: ({ row }) => {
        const item = row.original
        if (item.needsGrading) {
          return h(Badge, { variant: 'destructive' }, () => 'Belum dinilai')
        }
        if (!hasAnswer(item)) {
          return h(Badge, { variant: 'outline' }, () => 'Tidak dijawab')
        }
        const score = item.score ?? 0
        if (score >= item.points) {
          return h(Check, { class: 'mx-auto size-4 text-success' })
        }
        if (score <= 0) {
          return h(X, { class: 'mx-auto size-4 text-destructive' })
        }
        return h(Badge, { variant: 'warning' }, () => 'Sebagian')
      },
    },
    {
      id: 'score',
      header: 'Nilai',
      meta: {
        align: 'center',
        mobileLabel: 'Nilai',
      },
      cell: ({ row }) =>
        h(ScoreCell, {
          sessionId: options.sessionId,
          item: row.original,
          canGrade: options.canGrade,
          onGraded: options.onGraded,
        }),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      meta: { align: 'center' },
      cell: ({ row }) =>
        h(ActionCell, {
          viewLabel:
            row.original.manual && options.canGrade ? 'Nilai' : 'Lihat',
          hideEdit: true,
          hideDelete: true,
          onView: () => options.onOpen(row.original),
        }),
    },
  ]
}
