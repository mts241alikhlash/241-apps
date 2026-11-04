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
import { galleryService } from '../services/galleryService'
import { useGalleryStore } from '../stores/galleryStore'
import type { GalleryAlbum } from '../types'

const router = useRouter()
const store = useGalleryStore()

onMounted(() => void galleryService.fetchList())

function openEdit(id: string) {
  void router.push({ name: 'admin-album-edit', params: { id } })
}

async function togglePublished(album: GalleryAlbum) {
  await galleryService.setPublished(
    album.id,
    album.version,
    album.status !== 'PUBLISHED',
  )
}

async function remove(album: GalleryAlbum) {
  if (!window.confirm(`Hapus album "${album.title}"?`)) return
  await galleryService.remove(album.id)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

const columns: ColumnDef<GalleryAlbum>[] = [
  {
    accessorKey: 'title',
    header: 'Album',
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
    accessorKey: 'eventDate',
    header: 'Tanggal kegiatan',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-muted-foreground' },
        formatDate(row.original.eventDate),
      ),
  },
  {
    accessorKey: 'photoCount',
    header: 'Foto',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-muted-foreground' },
        row.original.photoCount ?? 0,
      ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const album = row.original
      return h(
        Badge,
        { variant: album.status === 'PUBLISHED' ? 'default' : 'outline' },
        () => CONTENT_STATUS_LABELS[album.status],
      )
    },
  },
  {
    id: 'actions',
    header: 'Aksi',
    meta: { align: 'center' },
    cell: ({ row }) => {
      const album = row.original
      return h(ActionCell, {
        hideEdit: true,
        hideDelete: true,
        items: [
          {
            label: album.status === 'PUBLISHED' ? 'Tarik' : 'Terbitkan',
            icon: album.status === 'PUBLISHED' ? EyeOff : Eye,
            disabled: store.isSaving,
            onClick: () => void togglePublished(album),
          },
          {
            label: 'Hapus',
            icon: Trash2,
            destructive: true,
            onClick: () => void remove(album),
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
          <CardTitle size="lg">Galeri</CardTitle>
        </div>
        <Button @click="router.push({ name: 'admin-album-new' })">
          <Plus class="mr-2 h-4 w-4" />
          Album baru
        </Button>
      </CardHeader>

      <CardContent class="p-0 sm:px-0">
        <DataTable
          :columns="columns"
          :data="store.albums"
          :is-loading="store.loading"
          item-label="album"
          filter-column="title"
          filter-placeholder="Cari album..."
        />
      </CardContent>
    </Card>
  </div>
</template>
