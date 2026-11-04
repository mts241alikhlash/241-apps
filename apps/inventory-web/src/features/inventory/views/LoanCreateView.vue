<script setup lang="ts">
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Button, BackButton } from '@mts241alikhlash/ui'
import { Input } from '@mts241alikhlash/ui/input'
import { Label } from '@mts241alikhlash/ui/label'
import { DataTable, Badge, DatePicker } from '@mts241alikhlash/ui'
import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import type { InventoryAssetUnit } from '../types'
import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { assetService } from '../services/assetService'
import { loanService } from '../services/loanService'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'

type LoanUnitRow = InventoryAssetUnit & {
  assetName: string
  categoryName: string
}

const router = useRouter()
const isSubmitting = ref(false)
const loadingUnits = ref(false)
const availableUnits = ref<LoanUnitRow[]>([])
const selectedUnits = ref<LoanUnitRow[]>([])

const createForm = ref({
  purpose: '',
  expectedReturnDate: '',
})

const selectColumn: ColumnDef<LoanUnitRow> = {
  id: 'select',
  header: ({ table }) =>
    h(Checkbox, {
      modelValue:
        table.getIsAllPageRowsSelected() ||
        (table.getIsSomePageRowsSelected() && 'indeterminate'),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
        table.toggleAllPageRowsSelected(value === true),
      ariaLabel: 'Pilih semua',
    }),
  cell: ({ row }) =>
    h(Checkbox, {
      modelValue: row.getIsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
        row.toggleSelected(value === true),
      ariaLabel: 'Pilih baris',
    }),
  enableSorting: false,
  enableHiding: false,
}

const columns: ColumnDef<LoanUnitRow>[] = [
  selectColumn,
  {
    id: 'unitNumber',
    header: 'No. Unit',
    cell: ({ row }) => row.original.unitNumber,
    accessorKey: 'unitNumber',
  },
  {
    id: 'assetName',
    header: 'Nama Aset',
    cell: ({ row }) => row.original.assetName,
    accessorKey: 'assetName',
  },
  {
    id: 'categoryName',
    header: 'Kategori',
    cell: ({ row }) => row.original.categoryName,
    accessorKey: 'categoryName',
  },
  {
    id: 'location',
    header: 'Lokasi',
    cell: ({ row }) => {
      const loc = row.original.location
      return loc ? `${loc.name} (${loc.building ?? ''})` : '-'
    },
    accessorFn: (row) => row.location?.name,
  },
  {
    id: 'condition',
    header: 'Kondisi',
    cell: ({ row }) => {
      const cond = row.original.condition
      if (!cond) return '-'
      const variant = cond.isUsable ? 'outline' : 'destructive'
      return h(Badge, { variant }, () => cond.name)
    },
    accessorFn: (row) => row.condition?.name,
  },
]

async function loadAvailableUnits() {
  loadingUnits.value = true
  try {
    const { items } = await assetService.listUnits({
      lendable: true,
      limit: PAGINATION.REFERENCE_LIMIT,
    })
    availableUnits.value = items.map((u) => ({
      ...u,
      assetName: u.asset?.name ?? '-',
      categoryName: u.asset?.category?.name ?? '-',
    }))
  } catch (error) {
    toast.error(
      getIndonesianErrorMessage(error, 'Gagal memuat daftar unit tersedia.'),
    )
  } finally {
    loadingUnits.value = false
  }
}

onMounted(() => {
  void loadAvailableUnits()
})

function handleSelectionChange(rows: LoanUnitRow[]) {
  selectedUnits.value = rows
}

async function handleCreateLoan() {
  if (selectedUnits.value.length === 0) {
    toast.error('Pilih minimal satu unit untuk dipinjam.')
    return
  }

  isSubmitting.value = true
  try {
    const created = await loanService.create({
      purpose: createForm.value.purpose,
      expectedReturnDate: createForm.value.expectedReturnDate,
      unitIds: selectedUnits.value.map((u) => u.id),
    })
    if (created) void router.push({ name: 'inventory-loans' })
  } catch (error) {
    toast.error(
      getIndonesianErrorMessage(error, 'Gagal membuat pengajuan peminjaman.'),
    )
  } finally {
    isSubmitting.value = false
  }
}

function handleCancel() {
  void router.push({ name: 'inventory-loans' })
}
</script>

<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardHeader
        standard
        class="min-h-0 border-b-0 bg-transparent px-0 pt-0 pb-3 sm:px-0"
      >
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke daftar peminjaman"
            @click="handleCancel"
          />
          <div>
            <CardTitle size="lg">Pinjam Aset Baru</CardTitle>
            <p class="text-sm text-muted-foreground mt-1">
              Ajukan permohonan peminjaman logistik sekolah baru.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent class="p-0 sm:px-0">
        <form
          class="space-y-6"
          @submit.prevent="handleCreateLoan"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div class="space-y-1">
              <Label for="purpose"
                >Tujuan Peminjaman
                <span class="text-destructive">*</span></Label
              >
              <Input
                id="purpose"
                v-model="createForm.purpose"
                required
                placeholder="Contoh: Kegiatan Ujian Akhir Sekolah di Lab"
                :disabled="isSubmitting"
              />
            </div>

            <div class="space-y-1 flex flex-col">
              <Label
                class="mb-1"
                for="expectedReturnDate"
                >Rencana Tanggal Pengembalian
                <span class="text-destructive">*</span></Label
              >
              <DatePicker
                id="expectedReturnDate"
                :model-value="createForm.expectedReturnDate"
                :allow-future-dates="true"
                :disabled="isSubmitting"
                @update:model-value="createForm.expectedReturnDate = $event"
              />
            </div>
          </div>

          <div class="space-y-3">
            <Label class="text-base font-semibold"
              >Pilih Unit Tersedia
              <span class="text-destructive">*</span></Label
            >
            <DataTable
              :columns="columns"
              :data="availableUnits"
              :is-loading="loadingUnits"
              item-label="unit tersedia"
              @selection-change="handleSelectionChange"
            />
          </div>

          <div class="flex items-center justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              :disabled="isSubmitting"
              @click="handleCancel"
            >
              Batal
            </Button>
            <Button
              type="submit"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan' }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
