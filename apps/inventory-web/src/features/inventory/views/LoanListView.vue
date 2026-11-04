<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, RotateCcw } from '@lucide/vue'
import { DataTable, Badge } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { Input } from '@mts241alikhlash/ui/input'
import { Label } from '@mts241alikhlash/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { inventoryReferenceService } from '../services/inventoryReferenceService'
import { loanService } from '../services/loanService'
import type {
  InventoryLoan,
  InventoryMetadata,
  InventoryStatus,
  InventoryLoanItem,
} from '../types'

const loans = ref<InventoryLoan[]>([])
const router = useRouter()
const loading = ref(false)
const isSubmitting = ref(false)
const metadata = ref<InventoryMetadata | null>(null)

const isReturnOpen = ref(false)
const selectedLoanForReturn = ref<InventoryLoan | null>(null)

const returnForm = ref({
  items: [] as {
    unitId: string
    returnedConditionId: string
    notes: string
  }[],
})

async function loadData() {
  loading.value = true
  try {
    const [meta, loansRes] = await Promise.all([
      inventoryReferenceService.fetchMetadata(),
      loanService.list(),
    ])
    metadata.value = meta
    loans.value = loansRes
  } catch (error) {
    toast.error(
      getIndonesianErrorMessage(error, 'Gagal memuat data peminjaman.'),
    )
  } finally {
    loading.value = false
  }
}

function openReturnDialog(loan: InventoryLoan) {
  selectedLoanForReturn.value = loan
  returnForm.value.items = loan.items.map((item: InventoryLoanItem) => ({
    unitId: item.unitId,
    returnedConditionId: item.unit?.conditionId ?? '',
    notes: '',
  }))
  isReturnOpen.value = true
}

async function handleReturnLoan() {
  if (!selectedLoanForReturn.value) return
  isSubmitting.value = true
  const returned = await loanService.returnLoan(
    selectedLoanForReturn.value.id,
    { items: returnForm.value.items },
  )
  isSubmitting.value = false
  if (!returned) return
  isReturnOpen.value = false
  await loadData()
}

const columns: ColumnDef<InventoryLoan>[] = [
  {
    id: 'no',
    header: 'No',
    cell: ({ row }) => row.index + 1,
  },
  {
    id: 'loanNumber',
    header: 'No. Pinjam',
    cell: ({ row }) => row.original.loanNumber,
  },
  {
    id: 'purpose',
    header: 'Tujuan',
    cell: ({ row }) => row.original.purpose,
  },
  {
    id: 'assets',
    header: 'Unit',
    cell: ({ row }) => {
      const items = row.original.items ?? []
      return items
        .map((i: InventoryLoanItem) => i.unit?.unitNumber ?? '-')
        .join(', ')
    },
  },
  {
    id: 'expectedReturnDate',
    header: 'Batas Kembali',
    cell: ({ row }) => {
      const d = row.original.expectedReturnDate
      return d ? new Date(d).toLocaleDateString('id-ID') : '-'
    },
  },
  {
    id: 'actualReturnDate',
    header: 'Tgl Kembali',
    cell: ({ row }) => {
      const d = row.original.actualReturnDate
      return d ? new Date(d).toLocaleDateString('id-ID') : '-'
    },
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const loan = row.original
      const status = metadata.value?.statuses.find(
        (s: InventoryStatus) => s.id === loan.statusId,
      )
      if (!status) return '-'

      let variant: 'default' | 'secondary' | 'destructive' | 'outline' =
        'outline'
      if (status.systemKey === 'LOAN_APPROVED') variant = 'default'
      else if (status.systemKey === 'LOAN_PENDING') variant = 'secondary'
      else if (status.systemKey === 'LOAN_REJECTED') variant = 'destructive'
      else if (status.systemKey === 'LOAN_RETURNED') variant = 'outline'

      return h(Badge, { variant }, () => status.name)
    },
  },
  {
    id: 'actions',
    header: 'Opsi',
    cell: ({ row }) => {
      const loan = row.original
      const status = metadata.value?.statuses.find(
        (s: InventoryStatus) => s.id === loan.statusId,
      )

      if (status?.systemKey === 'LOAN_APPROVED') {
        return h(
          Button,
          {
            size: 'sm',
            variant: 'outline',
            onClick: () => openReturnDialog(loan),
          },
          () => [h(RotateCcw, { class: 'size-4 mr-1' }), 'Kembalikan'],
        )
      }
      return '-'
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
        <div>
          <CardTitle size="lg">Transaksi Peminjaman</CardTitle>
        </div>
        <Button @click="router.push({ name: 'inventory-loans-create' })">
          <Plus class="size-4 mr-2" />
          Pinjam Aset
        </Button>
      </CardHeader>
      <CardContent class="p-0 sm:px-0">
        <DataTable
          :columns="columns"
          :data="loans"
          :loading="loading"
        />
      </CardContent>
    </Card>
  </div>

  <Dialog
    :open="isReturnOpen"
    @update:open="isReturnOpen = $event"
  >
    <DialogContent class="sm:max-w-[550px]">
      <DialogHeader>
        <DialogTitle>Proses Pengembalian Aset</DialogTitle>
        <DialogDescription>
          Perbarui kondisi aset yang dikembalikan ke dalam inventaris sekolah.
        </DialogDescription>
      </DialogHeader>

      <form
        class="space-y-4 py-2"
        @submit.prevent="handleReturnLoan"
      >
        <div class="space-y-3 max-h-[250px] overflow-y-auto pr-1">
          <div
            v-for="item in returnForm.items"
            :key="item.unitId"
            class="border p-3 rounded-lg bg-card space-y-2"
          >
            <div class="text-sm font-semibold text-foreground">
              {{
                selectedLoanForReturn?.items.find(
                  (i) => i.unitId === item.unitId,
                )?.unit?.unitNumber
              }}
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1">
                <Label>Kondisi Saat Kembali</Label>
                <select
                  v-model="item.returnedConditionId"
                  class="flex min-h-[var(--control-h-md,1.75rem)] w-full rounded-md border border-input bg-transparent px-3 py-1 text-[length:var(--text-control,0.75rem)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option
                    v-for="cond in metadata?.conditions"
                    :key="cond.id"
                    :value="cond.id"
                  >
                    {{ cond.name }}
                  </option>
                </select>
              </div>
              <div class="space-y-1">
                <Label>Catatan Pengembalian</Label>
                <Input
                  v-model="item.notes"
                  placeholder="Catatan (opsional)"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter class="pt-4">
          <Button
            type="button"
            variant="outline"
            @click="isReturnOpen = false"
            >Batal</Button
          >
          <Button
            type="submit"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? 'Memproses...' : 'Proses Kembali' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
