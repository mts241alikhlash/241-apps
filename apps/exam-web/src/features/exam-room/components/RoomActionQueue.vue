<script setup lang="ts">
import { computed, h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell, DataTable } from '@mts241alikhlash/ui'
import { History, Laptop, Undo2 } from '@lucide/vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { isLowBattery } from './roomParticipantColumns'
import type { RoomMonitorParticipant } from '../types'

const props = defineProps<{
  participants: RoomMonitorParticipant[]
  canRecover: boolean
}>()

const emit = defineEmits<{
  reopen: [row: RoomMonitorParticipant]
  release: [row: RoomMonitorParticipant]
  timeline: [row: RoomMonitorParticipant]
}>()

interface Entry {
  id: string
  row: RoomMonitorParticipant
  reason: string
  tone: 'destructive' | 'warning'
  primary: 'reopen' | 'release' | 'timeline'
}

const OFFLINE_MS = 60_000

const entries = computed<Entry[]>(() => {
  const now = Date.now()
  const found = props.participants.flatMap((row): Entry[] => {
    const session = row.session
    if (session === null || row.absence !== null) return []
    const base = { id: row.studentId, row }
    if (session.lockedByViolation) {
      return [
        {
          ...base,
          reason: 'Terkunci pelanggaran',
          tone: 'destructive',
          primary: 'reopen',
        },
      ]
    }
    if (session.requiresTokenReentry) {
      return [
        {
          ...base,
          reason: 'Menunggu token ulang',
          tone: 'destructive',
          primary: 'release',
        },
      ]
    }
    if (
      session.status === 'IN_PROGRESS' &&
      session.lastSeenAt !== null &&
      now - Date.parse(session.lastSeenAt) > OFFLINE_MS
    ) {
      const minutes = Math.floor(
        (now - Date.parse(session.lastSeenAt)) / 60_000,
      )
      return [
        {
          ...base,
          reason:
            minutes < 1
              ? 'Tidak ada kabar'
              : `Tidak ada kabar ${minutes} menit`,
          tone: 'warning',
          primary: 'timeline',
        },
      ]
    }
    if (session.unsyncedCount > 0) {
      return [
        {
          ...base,
          reason: `${session.unsyncedCount} jawaban tertunda di HP`,
          tone: 'warning',
          primary: 'timeline',
        },
      ]
    }
    if (isLowBattery(session)) {
      return [
        {
          ...base,
          reason: `Baterai ${session.batteryLevel}%`,
          tone: 'warning',
          primary: 'timeline',
        },
      ]
    }
    return []
  })
  return [
    ...found.filter((entry) => entry.tone === 'destructive'),
    ...found.filter((entry) => entry.tone === 'warning'),
  ]
})

const seat = (entry: Entry) => String(entry.row.seatNumber).padStart(2, '0')

const columns = computed<ColumnDef<Entry>[]>(() => [
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
      mobileValue: (entry: Entry) => entry.row.participantNumber ?? '-',
    },
    cell: ({ row }) => h('span', row.original.row.participantNumber ?? '-'),
  },
  {
    id: 'participant',
    header: 'Peserta',
    meta: {
      align: 'left',
      strong: true,
      mobileLabel: 'Peserta',
      mobileValue: (entry: Entry) => entry.row.studentName ?? '-',
    },
    cell: ({ row }) => h('span', row.original.row.studentName ?? '-'),
  },
  {
    id: 'reason',
    header: 'Masalah',
    meta: {
      align: 'center',
      mobileLabel: 'Masalah',
      mobileValue: (entry: Entry) => entry.reason,
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
      <CardTitle size="md">Perlu Tindakan</CardTitle>
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
          <p>Tidak ada peserta yang perlu ditangani.</p>
        </template>
      </DataTable>
    </CardContent>
  </Card>
</template>
