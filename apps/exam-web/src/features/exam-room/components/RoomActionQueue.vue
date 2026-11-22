<script setup lang="ts">
import { computed, h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { DataTable } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
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
  action: string
  run: () => void
}

const OFFLINE_MS = 60_000

const entries = computed<Entry[]>(() => {
  const now = Date.now()
  return props.participants.flatMap((row): Entry[] => {
    const session = row.session
    if (session === null || row.absence !== null) return []
    const base = { id: row.studentId, row }
    if (session.lockedByViolation) {
      return [
        {
          ...base,
          reason: 'Terkunci pelanggaran',
          tone: 'destructive',
          action: 'Buka Kembali',
          run: () => emit('reopen', row),
        },
      ]
    }
    if (session.requiresTokenReentry) {
      return [
        {
          ...base,
          reason: 'Menunggu token ulang',
          tone: 'warning',
          action: 'Lepas Perangkat',
          run: () => emit('release', row),
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
          action: 'Riwayat',
          run: () => emit('timeline', row),
        },
      ]
    }
    if (session.unsyncedCount > 0) {
      return [
        {
          ...base,
          reason: `${session.unsyncedCount} jawaban tertunda di HP`,
          tone: 'warning',
          action: 'Riwayat',
          run: () => emit('timeline', row),
        },
      ]
    }
    if (isLowBattery(session)) {
      return [
        {
          ...base,
          reason: `Baterai ${session.batteryLevel}%`,
          tone: 'warning',
          action: 'Riwayat',
          run: () => emit('timeline', row),
        },
      ]
    }
    return []
  })
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
    cell: ({ row }) => {
      const entry = row.original
      if (!props.canRecover && entry.action !== 'Riwayat') return null
      return h(
        Button,
        { variant: 'outline', onClick: () => entry.run() },
        () => entry.action,
      )
    },
  },
])

const title = computed(() =>
  entries.value.length > 0
    ? `Perlu Tindakan (${entries.value.length})`
    : 'Perlu Tindakan',
)
</script>

<template>
  <Card gap="none">
    <CardHeader standard>
      <CardTitle size="md">{{ title }}</CardTitle>
    </CardHeader>
    <CardContent
      variant="standard"
      class="sm:max-h-80 sm:overflow-y-auto"
    >
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
