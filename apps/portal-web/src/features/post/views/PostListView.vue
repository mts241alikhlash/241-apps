<script setup lang="ts">
import { computed, h, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell, DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { Badge } from '@mts241alikhlash/ui/badge'
import {
  Archive,
  EyeOff,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Trash2,
} from '@lucide/vue'
import { postService } from '../services/postService'
import { usePostStore } from '../stores/postStore'
import {
  CONTENT_STATUS_LABELS,
  POST_TYPE_LABELS,
  type ContentStatus,
  type PostAdminSummary,
  type PostType,
} from '../types'

const route = useRoute()
const router = useRouter()
const store = usePostStore()

const postType = computed(() => (route.meta.postType as PostType) ?? 'BERITA')

const STATUS_VARIANTS: Record<
  ContentStatus,
  'default' | 'secondary' | 'outline'
> = {
  PUBLISHED: 'default',
  SCHEDULED: 'secondary',
  DRAFT: 'outline',
  ARCHIVED: 'outline',
}

function load() {
  void postService.fetchList(postType.value)
}

onMounted(load)
watch(postType, () => {
  store.page = 1
  store.search = ''
  store.showDeleted = false
  load()
})

watch(
  () => store.showDeleted,
  () => {
    store.page = 1
    load()
  },
)

async function transition(
  post: PostAdminSummary,
  action: 'unpublish' | 'archive' | 'pin' | 'unpin',
) {
  await postService.transition(post.id, action, { version: post.version })
}

async function remove(post: PostAdminSummary) {
  const confirmed = window.confirm(
    `Hapus "${post.title}"? Konten dapat dipulihkan dalam 30 hari.`,
  )
  if (!confirmed) return
  await postService.remove(post.id)
}

async function restore(post: PostAdminSummary) {
  const restored = await postService.restore(post.id)
  if (restored) load()
}

function openNew() {
  void router.push({
    name: 'admin-post-new',
    params: { type: postType.value.toLowerCase() },
  })
}

function openEdit(id: string) {
  void router.push({ name: 'admin-post-edit', params: { id } })
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

const columns = computed<ColumnDef<PostAdminSummary>[]>(() => [
  {
    accessorKey: 'title',
    header: 'Judul',
    cell: ({ row }) => {
      const post = row.original
      return h(
        'button',
        {
          class:
            'font-medium text-left hover:underline cursor-pointer flex items-center gap-2',
          onClick: () => openEdit(post.id),
        },
        [
          post.pinnedAt
            ? h(Pin, { class: 'size-3.5 text-primary shrink-0' })
            : null,
          post.title,
        ],
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const post = row.original
      return h(
        Badge,
        { variant: STATUS_VARIANTS[post.status] },
        () => CONTENT_STATUS_LABELS[post.status],
      )
    },
  },
  {
    accessorKey: 'categoryName',
    header: 'Kategori',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-muted-foreground' },
        row.original.category?.name ?? '-',
      ),
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
    accessorKey: 'authorName',
    header: 'Penulis',
    cell: ({ row }) =>
      h('span', { class: 'text-muted-foreground' }, row.original.authorName),
  },
  {
    id: 'actions',
    header: 'Aksi',
    meta: { align: 'center' },
    cell: ({ row }) => {
      const post = row.original
      const disabled = store.isSaving
      const removeItem = {
        label: 'Hapus',
        icon: Trash2,
        destructive: true,
        disabled,
        onClick: () => void remove(post),
      }
      if (store.showDeleted) {
        return h(ActionCell, {
          hideEdit: true,
          hideDelete: true,
          items: [
            {
              label: 'Pulihkan',
              icon: RotateCcw,
              disabled,
              onClick: () => void restore(post),
            },
          ],
        })
      }

      const items = [
        {
          label: post.pinnedAt ? 'Lepas sematan' : 'Sematkan',
          icon: post.pinnedAt ? PinOff : Pin,
          disabled,
          onClick: () => void transition(post, post.pinnedAt ? 'unpin' : 'pin'),
        },
        ...(post.status === 'PUBLISHED' || post.status === 'SCHEDULED'
          ? [
              {
                label: 'Tarik dari publikasi',
                icon: EyeOff,
                disabled,
                onClick: () => void transition(post, 'unpublish'),
              },
            ]
          : []),
        ...(post.status !== 'ARCHIVED'
          ? [
              {
                label: 'Arsipkan',
                icon: Archive,
                disabled,
                onClick: () => void transition(post, 'archive'),
              },
            ]
          : []),
        removeItem,
      ]
      return h(ActionCell, { hideEdit: true, hideDelete: true, items })
    },
  },
])
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
        <CardTitle size="lg">
          {{ POST_TYPE_LABELS[postType] }}
        </CardTitle>
        <Button @click="openNew">
          <Plus class="mr-2 h-4 w-4" />
          Tulis {{ POST_TYPE_LABELS[postType] }}
        </Button>
      </CardHeader>

      <CardContent class="space-y-4 p-0 sm:px-0">
        <div
          v-if="store.conflict"
          class="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm"
        >
          {{ store.conflict }}
          <Button
            variant="link"
            size="sm"
            class="px-1"
            @click="load"
          >
            Muat ulang
          </Button>
        </div>

        <DataTable
          :columns="columns"
          :data="store.posts"
          :is-loading="store.loading"
          :item-label="POST_TYPE_LABELS[postType].toLowerCase()"
          filter-column="title"
          filter-placeholder="Cari judul atau ringkasan..."
        >
          <template #header-right>
            <Button
              size="sm"
              :variant="store.showDeleted ? 'default' : 'outline'"
              @click="store.showDeleted = !store.showDeleted"
            >
              <Trash2 class="mr-2 size-4" />
              Tempat sampah
            </Button>
          </template>
        </DataTable>
      </CardContent>
    </Card>
  </div>
</template>
