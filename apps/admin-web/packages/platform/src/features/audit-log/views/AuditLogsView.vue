<script setup lang="ts">
import { h, onMounted, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Input } from '@mts241alikhlash/ui/input'
import { Button } from '@mts241alikhlash/ui/button'
import { Badge } from '@mts241alikhlash/ui/badge'
import { RotateCcw } from '@lucide/vue'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { auditLogsApi } from '../api/auditLogsApi'
import type { AuditLog } from '../types'
import AuditLogDetailSheet from '../components/AuditLogDetailSheet.vue'
import type { ColumnDef } from '@tanstack/vue-table'

const logs = ref<AuditLog[]>([])
const isLoading = ref(false)
const totalItems = ref(0)

const filters = ref({
  page: 1,
  limit: 10,
  search: '',
  action: '',
  resource: '',
})

const isSheetOpen = ref(false)
const selectedLog = ref<AuditLog | null>(null)

const fetchLogs = async () => {
  isLoading.value = true
  try {
    const res = await auditLogsApi.getAuditLogs({
      page: filters.value.page,
      limit: filters.value.limit,
      search: filters.value.search ? filters.value.search : undefined,
      action: filters.value.action ? filters.value.action : undefined,
      resource: filters.value.resource ? filters.value.resource : undefined,
    })
    logs.value = res.data?.data ?? []
    totalItems.value = res.data?.meta?.total ?? 0
  } catch (error) {
    toast.error(getIndonesianErrorMessage(error, 'Gagal memuat log aktivitas.'))
  } finally {
    isLoading.value = false
  }
}

const resetFilters = () => {
  filters.value = {
    page: 1,
    limit: 10,
    search: '',
    action: '',
    resource: '',
  }
  void fetchLogs()
}

watch(
  () => filters.value.page,
  () => {
    void fetchLogs()
  },
)

watchDebounced(
  () => [filters.value.search, filters.value.resource, filters.value.action],
  () => {
    filters.value.page = 1
    void fetchLogs()
  },
  { debounce: 400 },
)

const formatIndonesianDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date
    .toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(/\./g, ':')
}

const getActionVariant = (action: string) => {
  const lower = action.toLowerCase()
  if (
    lower.includes('create') ||
    lower.includes('store') ||
    lower.includes('add')
  )
    return 'default'
  if (
    lower.includes('update') ||
    lower.includes('edit') ||
    lower.includes('patch')
  )
    return 'outline'
  if (
    lower.includes('delete') ||
    lower.includes('destroy') ||
    lower.includes('remove')
  )
    return 'destructive'
  return 'secondary'
}

const columns: ColumnDef<AuditLog>[] = [
  {
    id: 'no',
    header: 'No',
    cell: ({ row }) =>
      (filters.value.page - 1) * filters.value.limit + row.index + 1,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'createdAt',
    header: 'Waktu',
    cell: ({ row }) => formatIndonesianDateTime(row.original.createdAt),
  },
  {
    id: 'user',
    header: 'Pengguna',
    cell: ({ row }) => row.original.user?.identifier ?? 'Sistem / Anonim',
  },
  {
    accessorKey: 'action',
    header: 'Aksi',
    cell: ({ row }) => {
      const action = row.getValue<string>('action')
      return h(
        Badge,
        {
          variant: getActionVariant(action),
          class: 'text-[11px] px-2 py-0.5 font-medium font-mono',
        },
        () => action,
      )
    },
  },
  {
    accessorKey: 'resource',
    header: 'Modul / Entitas',
    cell: ({ row }) =>
      h(
        Badge,
        {
          variant: 'secondary',
          class: 'font-mono text-[10px] px-2 py-0.5 rounded-md border',
        },
        () => row.getValue<string>('resource'),
      ),
  },
  {
    accessorKey: 'ipAddress',
    header: 'IP Address',
    cell: ({ row }) => row.getValue<string>('ipAddress') ?? '-',
  },
  {
    id: 'actions',
    header: 'Opsi',
    cell: ({ row }) => {
      return h(
        Button,
        {
          variant: 'ghost',
          size: 'sm',
          onClick: () => {
            selectedLog.value = row.original
            isSheetOpen.value = true
          },
        },
        () => 'Detail',
      )
    },
  },
]

const handlePageChange = (page: number) => {
  filters.value.page = page
}

onMounted(() => {
  void fetchLogs()
})
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
          <CardTitle size="lg"> Log Aktivitas Sistem </CardTitle>
        </div>
      </CardHeader>

      <CardContent class="p-0 sm:px-0">
        <div class="flex flex-col md:flex-row gap-4 items-end mb-6">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full">
            <div class="space-y-1.5">
              <span class="text-xs font-semibold text-muted-foreground"
                >Kata Kunci Pencarian</span
              >
              <SearchInput
                v-model="filters.search"
                label="Cari kata kunci, IP, agent"
                class="sm:w-full"
              />
            </div>
            <div class="space-y-1.5">
              <span class="text-xs font-semibold text-muted-foreground"
                >Filter Modul</span
              >
              <Input
                v-model="filters.resource"
                placeholder="Contoh: students, roles"
                class="text-[length:var(--text-control,0.75rem)]"
              />
            </div>
            <div class="space-y-1.5">
              <span class="text-xs font-semibold text-muted-foreground"
                >Filter Aksi</span
              >
              <Input
                v-model="filters.action"
                placeholder="Contoh: create, update"
                class="text-[length:var(--text-control,0.75rem)]"
              />
            </div>
          </div>
          <Button
            variant="outline"
            class="gap-1.5 w-full md:w-auto"
            @click="resetFilters"
          >
            <RotateCcw class="size-3.5" />
            Reset
          </Button>
        </div>

        <DataTable
          :columns="columns"
          :data="logs"
          :is-loading="isLoading"
          :total-items="totalItems"
          item-label="log aktivitas"
          @update:page="handlePageChange"
        />
      </CardContent>
    </Card>

    <AuditLogDetailSheet
      v-if="isSheetOpen"
      v-model:open="isSheetOpen"
      :log="selectedLog"
    />
  </div>
</template>
