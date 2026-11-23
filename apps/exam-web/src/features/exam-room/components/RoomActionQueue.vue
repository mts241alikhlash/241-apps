<script setup lang="ts">
import { computed, h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell, DataTable, DataTableEmpty } from '@mts241alikhlash/ui'
import { History, Laptop, Undo2 } from '@lucide/vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { attentionOf, type AttentionEntry } from './roomAttention'
import type { RoomMonitorParticipant } from '../types'

const props = withDefaults(
  defineProps<{
    participants: RoomMonitorParticipant[]
    canRecover: boolean
    title?: string
    roomOf?: (row: RoomMonitorParticipant) => string
  }>(),
  { title: 'Perlu Tindakan', roomOf: undefined },
)

const emit = defineEmits<{
  reopen: [row: RoomMonitorParticipant]
  release: [row: RoomMonitorParticipant]
  timeline: [row: RoomMonitorParticipant]
}>()

const entries = computed<AttentionEntry[]>(() =>
  attentionOf(props.participants),
)

const seat = (entry: AttentionEntry) =>
  String(entry.row.seatNumber).padStart(2, '0')

const roomColumn = computed<ColumnDef<AttentionEntry>[]>(() => {
  const roomOf = props.roomOf
  if (roomOf === undefined) return []
  return [
    {
      id: 'room',
      header: 'Ruang',
      meta: {
        align: 'center',
        mobileLabel: 'Ruang',
        mobileValue: (entry: AttentionEntry) => roomOf(entry.row),
      },
      cell: ({ row }) => h('span', roomOf(row.original.row)),
    },
  ]
})

const columns = computed<ColumnDef<AttentionEntry>[]>(() => [
  ...roomColumn.value,
  {
    id: 'seat',
    header: 'Kursi',
    meta: {
      align: 'center',
      mobileLabel: 'Kursi',
      mobileValue: seat,
    },
    cell: ({ row }) => h('span', seat(row.original)),
  },
  {
    id: 'number',
    header: 'No. Peserta',
    meta: {
      align: 'center',
      mobileLabel: 'No. Peserta',
      mobileValue: (entry: AttentionEntry) =>
        entry.row.participantNumber ?? '-',
    },
    cell: ({ row }) => h('span', row.original.row.participantNumber ?? '-'),
  },
  {
    id: 'participant',
    header: 'Nama',
    meta: {
      align: 'left',
      strong: true,
      mobileLabel: 'Nama',
      mobileValue: (entry: AttentionEntry) => entry.row.studentName ?? '-',
    },
    cell: ({ row }) => h('span', row.original.row.studentName ?? '-'),
  },
  {
    id: 'reason',
    header: 'Masalah',
    meta: {
      align: 'center',
      mobileLabel: 'Masalah',
      mobileValue: (entry: AttentionEntry) => entry.reason,
    },
    cell: ({ row }) =>
      h(Badge, { variant: row.original.tone }, () => row.original.reason),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) => {
      const entry = row.original
      const items = []
      if (props.canRecover && entry.primary === 'reopen') {
        items.push({
          label: 'Buka Kembali Sesi',
          icon: Undo2,
          onClick: () => emit('reopen', entry.row),
        })
      }
      if (props.canRecover && entry.primary === 'release') {
        items.push({
          label: 'Lepas Perangkat',
          icon: Laptop,
          onClick: () => emit('release', entry.row),
        })
      }
      items.push({
        label: 'Riwayat Kejadian',
        icon: History,
        onClick: () => emit('timeline', entry.row),
      })
      return h(ActionCell, { hideEdit: true, hideDelete: true, items })
    },
  },
])
</script>

<template>
  <Card gap="none">
    <CardHeader standard>
      <CardTitle size="md">{{ title }}</CardTitle>
    </CardHeader>
    <CardContent variant="standard">
      <DataTable
        mobile="cards"
        :columns="columns"
        :data="entries"
        :page-size="100"
        :total-items="entries.length"
        hide-pagination
        hide-per-page
        item-label="peserta"
      >
        <template #empty>
          <DataTableEmpty message="Tidak ada peserta yang perlu ditangani." />
        </template>
      </DataTable>
    </CardContent>
  </Card>
</template>
