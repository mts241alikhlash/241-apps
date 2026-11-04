<script setup lang="ts">
import { h, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell, DataTable } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { Eye, EyeOff, Plus, Trash2 } from '@lucide/vue'
import { CONTENT_STATUS_LABELS } from '@/features/post'
import { agendaService } from '../services/agendaService'
import { useAgendaStore } from '../stores/agendaStore'
import type { AgendaEntry } from '../types'

const router = useRouter()
const store = useAgendaStore()

onMounted(() => void agendaService.fetchList())

function openNew() {
  void router.push({ name: 'admin-agenda-new' })
}

function openEdit(id: string) {
  void router.push({ name: 'admin-agenda-edit', params: { id } })
}

async function togglePublished(entry: AgendaEntry) {
  await agendaService.setPublished(
    entry.id,
    entry.version,
    entry.status !== 'PUBLISHED',
  )
}

async function remove(entry: AgendaEntry) {
  if (!window.confirm(`Hapus agenda "${entry.title}"?`)) return
  await agendaService.remove(entry.id)
}

function formatRange(entry: AgendaEntry) {
  const format = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  })
  return `${format.format(new Date(entry.startTime))} – ${format.format(new Date(entry.endTime))}`
}

const columns: ColumnDef<AgendaEntry>[] = [
  {
    accessorKey: 'title',
    header: 'Kegiatan',
    cell: ({ row }) =>
      h(
        'button',
        {
          class: 'font-medium text-left hover:underline cursor-pointer',
          onClick: () => openEdit(row.original.id),
        },
        row.original.title,
      ),
  },
  {
    id: 'startTime',
    header: 'Waktu',
    cell: ({ row }) =>
      h('span', { class: 'text-muted-foreground' }, formatRange(row.original)),
  },
  {
    accessorKey: 'location',
    header: 'Lokasi',
    cell: ({ row }) =>
      h('span', { class: 'text-muted-foreground' }, row.original.location),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const entry = row.original
      return h(
        Badge,
        { variant: entry.status === 'PUBLISHED' ? 'default' : 'outline' },
        () => CONTENT_STATUS_LABELS[entry.status],
      )
    },
  },
  {
    id: 'actions',
    header: 'Aksi',
    meta: { align: 'center' },
    cell: ({ row }) => {
      const entry = row.original
      return h(ActionCell, {
        hideEdit: true,
        hideDelete: true,
        items: [
          {
            label: entry.status === 'PUBLISHED' ? 'Tarik' : 'Terbitkan',
            icon: entry.status === 'PUBLISHED' ? EyeOff : Eye,
            disabled: store.isSaving,
            onClick: () => void togglePublished(entry),
          },
          {
            label: 'Hapus',
            icon: Trash2,
            destructive: true,
            onClick: () => void remove(entry),
          },
        ],
      })
    },
  },
]
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardHeader
        standard
        class="min-h-0 border-b-0 bg-transparent px-0 pt-0 pb-3 sm:px-0"
      >
        <div>
          <CardTitle size="lg">Agenda</CardTitle>
        </div>
        <Button @click="openNew">
          <Plus class="mr-2 h-4 w-4" />
          Agenda baru
        </Button>
      </CardHeader>

      <CardContent class="p-0 sm:px-0">
        <DataTable
          :columns="columns"
          :data="store.entries"
          :is-loading="store.loading"
          item-label="agenda"
          filter-column="title"
          filter-placeholder="Cari kegiatan..."
        />
      </CardContent>
    </Card>
  </div>
</template>
