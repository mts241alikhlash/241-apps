<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Printer } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import type {
  InventoryAsset,
  InventoryMetadata,
  AssetQueryParams,
  LabelUnit,
} from '../types'
import { createColumns } from '../components/columns'
import {
  DEFAULT_PAPER_ID,
  PAPER_SIZES,
  labelSheetLayout,
} from '../logic/labelSheetLayout'
import UnitLabelSheet from '../components/UnitLabelSheet.vue'
import { inventoryReferenceService } from '../services/inventoryReferenceService'
import { assetService } from '../services/assetService'

const assets = ref<InventoryAsset[]>([])
const loading = ref(false)

const metadata = ref<InventoryMetadata>({
  categories: [],
  locations: [],
  conditions: [],
  statuses: [],
  fundingSources: [],
})

const filters = ref({
  keyword: '',
  categoryId: 'all',
})

const tableColumns = computed(() =>
  createColumns({
    showActions: false,
    selectable: true,
    onEdit: () => undefined,
    onDelete: () => undefined,
  }),
)

async function fetchAssets() {
  loading.value = true
  try {
    const params: AssetQueryParams = {
      page: 1,
      limit: 1000,
      keyword: filters.value.keyword.trim()
        ? filters.value.keyword.trim()
        : undefined,
      categoryId:
        filters.value.categoryId !== 'all'
          ? filters.value.categoryId
          : undefined,
    }

    assets.value = (await assetService.list(params)).items
  } finally {
    loading.value = false
  }
}

async function fetchMetadata() {
  try {
    const data = await inventoryReferenceService.fetchMetadata()
    if (data) {
      metadata.value = data
    }
  } catch (e) {
    toast.error(
      getIndonesianErrorMessage(e, 'Gagal memuat parameter klasifikasi.'),
    )
  }
}

watch(
  () => filters.value.categoryId,
  () => {
    void fetchAssets()
  },
)

watchDebounced(
  () => filters.value.keyword,
  () => {
    void fetchAssets()
  },
  { debounce: 400 },
)

const selectedAssets = ref<InventoryAsset[]>([])
const paperSize = ref(DEFAULT_PAPER_ID)

const sheetPlan = computed(() => labelSheetLayout(paperSize.value))

const labelSheetRef = ref<{ print: () => Promise<void> } | null>(null)
const printUnits = ref<LabelUnit[]>([])

const selectedUnitCount = computed(() =>
  selectedAssets.value.reduce((sum, a) => sum + (a.units?.length ?? 0), 0),
)

function handleSelectionChange(rows: InventoryAsset[]) {
  selectedAssets.value = rows
}

async function printSelectedLabels() {
  const units: LabelUnit[] = []
  for (const a of selectedAssets.value) {
    for (const u of a.units ?? []) {
      units.push({
        id: u.id,
        unitNumber: u.unitNumber,
        assetName: a.name,
      })
    }
  }
  if (units.length === 0) return
  printUnits.value = units
  await nextTick()
  await labelSheetRef.value?.print()
}

onMounted(async () => {
  await Promise.all([fetchAssets(), fetchMetadata()])
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
          <CardTitle size="lg">Cetak Label Aset</CardTitle>
          <p class="text-sm text-muted-foreground mt-1">
            Pilih satu atau beberapa aset untuk mencetak label seluruh unitnya
            sekaligus.
          </p>
          <p
            v-if="selectedUnitCount > 0"
            class="text-xs text-muted-foreground mt-1.5"
          >
            {{ sheetPlan.paper.label.split(' (')[0] }} –
            <strong class="text-foreground">
              {{ sheetPlan.labelsPerPage }} label/halaman
            </strong>
            ({{ sheetPlan.columns }} × {{ sheetPlan.rowsPerPage }}), butuh
            {{ Math.ceil(selectedUnitCount / sheetPlan.labelsPerPage) }} halaman
          </p>
        </div>
        <div
          v-if="selectedAssets.length > 0"
          class="flex flex-col sm:flex-row w-full sm:w-auto gap-2"
        >
          <Select
            :model-value="paperSize"
            @update:model-value="paperSize = String($event)"
          >
            <SelectTrigger class="w-full sm:w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="paper in PAPER_SIZES"
                :key="paper.id"
                :value="paper.id"
              >
                {{ paper.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            :disabled="selectedUnitCount === 0"
            @click="printSelectedLabels"
          >
            <Printer class="size-4 mr-2" />
            Cetak Label ({{ selectedUnitCount }} unit)
          </Button>
        </div>
      </CardHeader>

      <CardContent class="p-0 sm:px-0">
        <div class="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <Select
            :model-value="filters.categoryId"
            @update:model-value="
              filters.categoryId = typeof $event === 'string' ? $event : 'all'
            "
          >
            <SelectTrigger
              class="w-full lg:w-fit lg:min-w-[150px] px-3! gap-2!"
            >
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              <SelectItem
                v-for="cat in metadata.categories"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.name }}
              </SelectItem>
            </SelectContent>
          </Select>

          <SearchInput
            v-model="filters.keyword"
            label="Cari aset"
            class="lg:ml-auto"
          />
        </div>

        <DataTable
          :columns="tableColumns"
          :data="assets"
          :is-loading="loading"
          item-label="aset"
          @selection-change="handleSelectionChange"
        />
      </CardContent>
    </Card>
  </div>

  <UnitLabelSheet
    ref="labelSheetRef"
    :units="printUnits"
    :paper-size="paperSize"
  />
</template>
