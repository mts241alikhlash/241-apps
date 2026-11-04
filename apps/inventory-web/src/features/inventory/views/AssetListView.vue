<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Plus, Filter } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { useRoleGuard } from '@/features/platform/auth'
import type {
  InventoryAsset,
  InventoryMetadata,
  AssetQueryParams,
} from '../types'
import { createColumns } from '../components/columns'
import { inventoryReferenceService } from '../services/inventoryReferenceService'
import { assetService } from '../services/assetService'

const { can } = useRoleGuard()
const router = useRouter()

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
  locationId: 'all',
  statusId: 'all',
  conditionId: 'all',
})

const isFilterDialogOpen = ref(false)

const activeFiltersCount = computed(() => {
  let count = 0
  if (filters.value.categoryId !== 'all') count++
  if (filters.value.locationId !== 'all') count++
  if (filters.value.statusId !== 'all') count++
  if (filters.value.conditionId !== 'all') count++
  return count
})

function resetAllFilters() {
  filters.value.categoryId = 'all'
  filters.value.locationId = 'all'
  filters.value.statusId = 'all'
  filters.value.conditionId = 'all'
}

function handleFilterChange(
  key: 'categoryId' | 'locationId' | 'statusId' | 'conditionId',
  value: unknown,
) {
  filters.value[key] = typeof value === 'string' ? value : 'all'
}

const tableColumns = computed(() =>
  createColumns({
    showActions:
      can('inventory-assets.update') || can('inventory-assets.delete'),
    canUpdate: can('inventory-assets.update'),
    canDelete: can('inventory-assets.delete'),
    onEdit: (asset) => {
      void router.push(`/assets/${asset.id}/edit`)
    },
    onDelete: async (asset, { closeAlert, setLoading }) => {
      setLoading(true)
      try {
        if (await assetService.remove(asset.id)) {
          await fetchAssets()
          closeAlert()
        }
      } finally {
        setLoading(false)
      }
    },
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
      locationId:
        filters.value.locationId !== 'all'
          ? filters.value.locationId
          : undefined,
      statusId:
        filters.value.statusId !== 'all' ? filters.value.statusId : undefined,
      conditionId:
        filters.value.conditionId !== 'all'
          ? filters.value.conditionId
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
  () => [
    filters.value.categoryId,
    filters.value.locationId,
    filters.value.statusId,
    filters.value.conditionId,
  ],
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

function openAddForm() {
  void router.push('/assets/create')
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
          <CardTitle size="lg">Daftar Aset</CardTitle>
        </div>
        <div class="flex items-center gap-2">
          <Button
            v-if="can('inventory-assets.create')"
            size="sm"
            class="sm:h-10 sm:px-4 text-xs sm:text-sm"
            @click="openAddForm"
          >
            <Plus class="size-4 mr-1 sm:mr-2" />
            Tambah Aset
          </Button>
        </div>
      </CardHeader>

      <CardContent class="p-0 sm:px-0">
        <div class="mb-6">
          <div class="hidden lg:flex lg:flex-row lg:items-center gap-3">
            <Select
              :model-value="filters.categoryId"
              @update:model-value="handleFilterChange('categoryId', $event)"
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

            <Select
              :model-value="filters.locationId"
              @update:model-value="handleFilterChange('locationId', $event)"
            >
              <SelectTrigger
                class="w-full lg:w-fit lg:min-w-[140px] px-3! gap-2!"
              >
                <SelectValue placeholder="Pilih lokasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Lokasi</SelectItem>
                <SelectItem
                  v-for="loc in metadata.locations"
                  :key="loc.id"
                  :value="loc.id"
                >
                  {{ loc.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              :model-value="filters.statusId"
              @update:model-value="handleFilterChange('statusId', $event)"
            >
              <SelectTrigger
                class="w-full lg:w-fit lg:min-w-[130px] px-3! gap-2!"
              >
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem
                  v-for="status in metadata.statuses"
                  :key="status.id"
                  :value="status.id"
                >
                  {{ status.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              :model-value="filters.conditionId"
              @update:model-value="handleFilterChange('conditionId', $event)"
            >
              <SelectTrigger
                class="w-full lg:w-fit lg:min-w-[135px] px-3! gap-2!"
              >
                <SelectValue placeholder="Pilih kondisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kondisi</SelectItem>
                <SelectItem
                  v-for="cond in metadata.conditions"
                  :key="cond.id"
                  :value="cond.id"
                >
                  {{ cond.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <SearchInput
              v-model="filters.keyword"
              label="Cari aset"
              class="lg:ml-auto"
            />
          </div>

          <div class="flex flex-col lg:hidden gap-3">
            <div class="flex items-center gap-2">
              <SearchInput
                v-model="filters.keyword"
                label="Cari aset"
                class="flex-1"
              />
              <Button
                variant="outline"
                class="relative shrink-0"
                @click="isFilterDialogOpen = true"
              >
                <Filter class="size-4 mr-2" />
                Filter
                <span
                  v-if="activeFiltersCount > 0"
                  class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
                >
                  {{ activeFiltersCount }}
                </span>
              </Button>
            </div>
          </div>
        </div>

        <DataTable
          :columns="tableColumns"
          :data="assets"
          :is-loading="loading"
          item-label="aset"
        />
      </CardContent>
    </Card>
  </div>

  <Dialog v-model:open="isFilterDialogOpen">
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>Filter Aset</DialogTitle>
        <DialogDescription class="sr-only"> </DialogDescription>
      </DialogHeader>

      <div class="p-6 space-y-4">
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-muted-foreground"
            >Kategori</label
          >
          <Select
            :model-value="filters.categoryId"
            @update:model-value="handleFilterChange('categoryId', $event)"
          >
            <SelectTrigger class="w-full">
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
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-muted-foreground"
            >Lokasi</label
          >
          <Select
            :model-value="filters.locationId"
            @update:model-value="handleFilterChange('locationId', $event)"
          >
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Pilih lokasi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Lokasi</SelectItem>
              <SelectItem
                v-for="loc in metadata.locations"
                :key="loc.id"
                :value="loc.id"
              >
                {{ loc.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-muted-foreground"
            >Status</label
          >
          <Select
            :model-value="filters.statusId"
            @update:model-value="handleFilterChange('statusId', $event)"
          >
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Pilih status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem
                v-for="status in metadata.statuses"
                :key="status.id"
                :value="status.id"
              >
                {{ status.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-muted-foreground"
            >Kondisi</label
          >
          <Select
            :model-value="filters.conditionId"
            @update:model-value="handleFilterChange('conditionId', $event)"
          >
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Pilih kondisi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kondisi</SelectItem>
              <SelectItem
                v-for="cond in metadata.conditions"
                :key="cond.id"
                :value="cond.id"
              >
                {{ cond.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter
        class="px-6 py-4 border-t bg-muted/20 flex flex-row items-center justify-end gap-2"
      >
        <Button
          variant="outline"
          size="sm"
          class="flex-1 sm:flex-none"
          @click="resetAllFilters"
        >
          Atur Ulang
        </Button>
        <Button
          size="sm"
          class="flex-1 sm:flex-none"
          @click="isFilterDialogOpen = false"
        >
          Tutup
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
