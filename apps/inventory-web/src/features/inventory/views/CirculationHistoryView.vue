<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { DataTable, Badge } from '@mts241alikhlash/ui'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { toast } from 'vue-sonner'
import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import type {
  InventoryHistory,
  InventoryMetadata,
  InventoryStatus,
  InventoryCondition,
} from '../types'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { inventoryReferenceService } from '../services/inventoryReferenceService'
import { loanService } from '../services/loanService'

const histories = ref<InventoryHistory[]>([])
const loading = ref(false)
const metadata = ref<InventoryMetadata | null>(null)

async function loadData() {
  loading.value = true
  try {
    const [meta, historyRes] = await Promise.all([
      inventoryReferenceService.fetchMetadata(),
      loanService.listHistories(),
    ])
    metadata.value = meta
    histories.value = historyRes
  } catch (error) {
    toast.error(
      getIndonesianErrorMessage(error, 'Gagal memuat riwayat sirkulasi.'),
    )
  } finally {
    loading.value = false
  }
}

const columns: ColumnDef<InventoryHistory>[] = [
  {
    id: 'no',
    header: 'No',
    cell: ({ row }) => row.index + 1,
  },
  {
    id: 'unit',
    header: 'Unit Aset',
    cell: ({ row }) => {
      const unit = row.original.unit
      if (!unit) return '-'
      const name = unit.asset?.name ?? 'Aset'
      return `${name} (${unit.unitNumber})`
    },
  },
  {
    id: 'transactionType',
    header: 'Jenis Transaksi',
    cell: ({ row }) => {
      const tt = row.original.transactionType
      if (!tt) return '-'
      const variant = tt.direction === 'OUT' ? 'destructive' : 'default'
      return h(Badge, { variant }, () => tt.name)
    },
  },
  {
    id: 'previousStatus',
    header: 'Status Sebelumnya',
    cell: ({ row }) => {
      const statusId = row.original.previousStatusId
      const status = metadata.value?.statuses.find(
        (s: InventoryStatus) => s.id === statusId,
      )
      return status ? status.name : '-'
    },
  },
  {
    id: 'newStatus',
    header: 'Status Baru',
    cell: ({ row }) => {
      const statusId = row.original.newStatusId
      const status = metadata.value?.statuses.find(
        (s: InventoryStatus) => s.id === statusId,
      )
      return status ? status.name : '-'
    },
  },
  {
    id: 'condition',
    header: 'Kondisi',
    cell: ({ row }) => {
      const prevCondId = row.original.previousConditionId
      const newCondId = row.original.newConditionId
      const prevCond = metadata.value?.conditions.find(
        (c: InventoryCondition) => c.id === prevCondId,
      )
      const newCond = metadata.value?.conditions.find(
        (c: InventoryCondition) => c.id === newCondId,
      )

      if (!newCond) return '-'
      if (prevCond && prevCond.id !== newCond.id) {
        return `${prevCond.name} → ${newCond.name}`
      }
      return newCond.name
    },
  },
  {
    id: 'note',
    header: 'Catatan',
    cell: ({ row }) => row.original.note ?? '-',
  },
  {
    id: 'changedAt',
    header: 'Tanggal Log',
    cell: ({ row }) => {
      const d = row.original.changedAt
      return d ? new Date(d).toLocaleString('id-ID') : '-'
    },
  },
]

onMounted(() => {
  void loadData()
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
        <div class="flex items-center gap-3">
          <CardTitle size="lg">Riwayat Sirkulasi Aset</CardTitle>
          <p class="text-sm text-muted-foreground mt-1">
            Pantau seluruh mutasi, peminjaman, dan pengembalian logistik
            sekolah.
          </p>
        </div>
      </CardHeader>
      <CardContent class="p-0 sm:px-0">
        <DataTable
          :columns="columns"
          :data="histories"
          :loading="loading"
        />
      </CardContent>
    </Card>
  </div>
</template>
