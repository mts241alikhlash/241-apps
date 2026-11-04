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
import { pageService } from '../services/pageService'
import { usePageStore } from '../stores/pageStore'
import type { PortalPage } from '../types'

const router = useRouter()
const store = usePageStore()

onMounted(() => void pageService.fetchList())

function openNew() {
  void router.push({ name: 'admin-page-new' })
}

function openEdit(id: string) {
  void router.push({ name: 'admin-page-edit', params: { id } })
}

async function togglePublished(page: PortalPage) {
  await pageService.setPublished(
    page.id,
    page.version,
    page.status !== 'PUBLISHED',
  )
}

async function remove(page: PortalPage) {
  const confirmed = window.confirm(
    `Hapus halaman "${page.title}"? Menu yang menautnya akan berhenti bekerja.`,
  )
  if (!confirmed) return
  await pageService.remove(page.id)
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

const columns: ColumnDef<PortalPage>[] = [
  {
    accessorKey: 'title',
    header: 'Judul',
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
    accessorKey: 'slug',
    header: 'Alamat',
    cell: ({ row }) =>
      h('span', { class: 'text-muted-foreground' }, `/${row.original.slug}`),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const page = row.original
      return h(
        Badge,
        { variant: page.status === 'PUBLISHED' ? 'default' : 'outline' },
        () => CONTENT_STATUS_LABELS[page.status],
      )
    },
  },
  {
    accessorKey: 'publishedAt',
    header: 'Terbit',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-muted-foreground' },
        formatDate(row.original.publishedAt),
      ),
  },
  {
    id: 'actions',
    header: 'Aksi',
    meta: { align: 'center' },
    cell: ({ row }) => {
      const page = row.original
      return h(ActionCell, {
        hideEdit: true,
        hideDelete: true,
        items: [
          {
            label:
              page.status === 'PUBLISHED'
                ? 'Tarik dari publikasi'
                : 'Terbitkan',
            icon: page.status === 'PUBLISHED' ? EyeOff : Eye,
            disabled: store.isSaving,
            onClick: () => void togglePublished(page),
          },
          {
            label: 'Hapus',
            icon: Trash2,
            destructive: true,
            onClick: () => void remove(page),
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
          <CardTitle size="lg">Halaman</CardTitle>
        </div>
        <Button @click="openNew">
          <Plus class="mr-2 h-4 w-4" />
          Halaman baru
        </Button>
      </CardHeader>

      <CardContent class="p-0 sm:px-0">
        <DataTable
          :columns="columns"
          :data="store.pages"
          :is-loading="store.loading"
          item-label="halaman"
          filter-column="title"
          filter-placeholder="Cari halaman..."
        />
      </CardContent>
    </Card>
  </div>
</template>
