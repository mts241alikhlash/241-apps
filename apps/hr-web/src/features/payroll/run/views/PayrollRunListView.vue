<script setup lang="ts">
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Input } from '@mts241alikhlash/ui/input'
import { Label } from '@mts241alikhlash/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Plus } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { MONTH_NAMES } from '../../shared/money'
import { createPayrollRunColumns } from '../components/payrollRunColumns'
import {
  isWorking,
  loading,
  payrollRunService,
  runs,
} from '../services/payrollRunService'
import type { CreatePayrollRunPayload, PayrollRun } from '../types'

const router = useRouter()
const dialogOpen = ref(false)

const now = new Date()
const currentYear = now.getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

const form = ref<Required<CreatePayrollRunPayload>>({
  year: currentYear,
  month: now.getMonth() === 0 ? 12 : now.getMonth(),
  kind: 'ORIGINAL',
  note: '',
})

const selectedFormYear = computed({
  get: () => String(form.value.year),
  set: (val: string) => {
    form.value.year = Number(val)
  },
})

const selectedFormMonth = computed({
  get: () => String(form.value.month),
  set: (val: string) => {
    form.value.month = Number(val)
  },
})

async function create() {
  const run = await payrollRunService.create({
    year: Number(form.value.year),
    month: Number(form.value.month),
    kind: form.value.kind,
    note: form.value.note || undefined,
  })

  if (run) {
    dialogOpen.value = false
    await router.push({ name: 'PayrollRunDetail', params: { id: run.id } })
  }
}

function handleViewDetail(run: PayrollRun) {
  void router.push({ name: 'PayrollRunDetail', params: { id: run.id } })
}

const tableColumns = computed(() =>
  createPayrollRunColumns((run) => handleViewDetail(run)),
)

onMounted(() => void payrollRunService.fetch())
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
        <CardTitle size="lg"> Perhitungan Gaji </CardTitle>
        <Button @click="dialogOpen = true">
          <Plus class="mr-2 h-4 w-4" />
          Hitung Bulan
        </Button>
      </CardHeader>

      <CardContent class="space-y-6 p-0 sm:px-0">
        <DataTable
          :columns="tableColumns"
          :data="runs"
          :is-loading="loading"
          item-label="perhitungan gaji"
        />
      </CardContent>
    </Card>
  </div>

  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>Hitung Penggajian Bulanan</DialogTitle>
        <DialogDescription class="sr-only" />
      </DialogHeader>

      <div class="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label>Tahun <span class="text-destructive">*</span></Label>
            <Select v-model="selectedFormYear">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="y in YEAR_OPTIONS"
                  :key="y"
                  :value="String(y)"
                >
                  {{ y }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label>Bulan <span class="text-destructive">*</span></Label>
            <Select v-model="selectedFormMonth">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="(name, index) in MONTH_NAMES"
                  :key="name"
                  :value="String(index + 1)"
                >
                  {{ name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="space-y-1.5">
          <Label
            >Jenis Perhitungan <span class="text-destructive">*</span></Label
          >
          <Select v-model="form.kind">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Pilih jenis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ORIGINAL">Utama</SelectItem>
              <SelectItem value="ADJUSTMENT">Penyesuaian</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-1.5">
          <Label for="run-note">Catatan</Label>
          <Input
            id="run-note"
            v-model="form.note"
            placeholder="Masukkan catatan..."
          />
        </div>
      </div>

      <DialogFooter
        class="px-6 py-4 border-t bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0"
      >
        <Button
          variant="outline"
          @click="dialogOpen = false"
        >
          Batal
        </Button>
        <Button
          :disabled="isWorking"
          @click="create"
        >
          Hitung
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
