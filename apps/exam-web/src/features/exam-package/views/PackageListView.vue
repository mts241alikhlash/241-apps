<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Card } from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Filter, Plus } from '@lucide/vue'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { buildPackageColumns } from '../components/packageColumns'
import PackageCreateDialog from '../components/PackageCreateDialog.vue'
import PackageFilterFields from '../components/PackageFilterFields.vue'
import { usePackageList } from '../composables/usePackageList'
import { examPackageService } from '../services/examPackageService'
import { useExamPackageStore } from '../stores/examPackageStore'
import type { ExamPackageSummary } from '../types'

const router = useRouter()
const { hasPermission, user } = useAuthSession()
const store = useExamPackageStore()
const { subjectOptions, gradeOptions } = storeToRefs(store)

const search = ref('')
const subjectId = ref('ALL')
const gradeId = ref('ALL')
const status = ref('ALL')
const page = ref(1)
const pageSize = ref(10)
const filterOpen = ref(false)
const copying = ref(false)
const createOpen = ref(false)

const { packages, totalItems, loading, listError, filtersPending, refresh } =
  usePackageList({ search, subjectId, gradeId, status }, page, pageSize)

watch(
  [search, subjectId, gradeId, status],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)

const activeFiltersCount = computed(
  () =>
    [subjectId, gradeId, status].filter((filter) => filter.value !== 'ALL')
      .length,
)

function resetFilters() {
  subjectId.value = 'ALL'
  gradeId.value = 'ALL'
  status.value = 'ALL'
}

function resetAllFilters() {
  resetFilters()
  search.value = ''
}

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

function openPackage(pkg: ExamPackageSummary) {
  void router.push(`/exam/packages/${pkg.id}`)
}

const columns = computed(() =>
  buildPackageColumns({
    subjectName: store.subjectName,
    gradeName: store.gradeName,
    canDelete: (row) =>
      hasPermission('exam-packages.delete') &&
      (row.createdById === user.value?.id ||
        hasPermission('exam-questions.manage-all')),
    canCopy: hasPermission('exam-packages.create'),
    onOpen: openPackage,
    onCopy: async (pkg) => {
      if (copying.value) return
      copying.value = true
      const copy = await examPackageService.copyPackage(pkg.id)
      copying.value = false
      if (copy) await router.push(`/exam/packages/${copy.id}`)
    },
    onDelete: async (pkg, { closeAlert, setLoading }) => {
      setLoading(true)
      const done = await examPackageService.deletePackage(pkg.id)
      setLoading(false)
      if (done) {
        closeAlert()
        await refresh()
      }
    },
  }),
)

onMounted(() => examPackageService.loadReferences())
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <div class="space-y-4 p-0 sm:px-0">
        <div
          v-if="listError"
          class="space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-[length:var(--text-control,0.75rem)]">
            {{ listError }}
          </p>
          <Button
            variant="outline"
            @click="refresh()"
          >
            Coba lagi
          </Button>
        </div>
        <DataTable
          v-else
          mobile="cards"
          row-clickable
          :columns="columns"
          :data="filtersPending ? [] : packages"
          :page="page"
          :page-size="pageSize"
          :total-items="totalItems"
          :is-loading="loading || filtersPending"
          item-label="paket"
          @update:page="page = $event"
          @update:page-size="changePageSize"
          @row-click="openPackage"
        >
          <template #header-left>
            <Button
              v-if="hasPermission('exam-packages.create')"
              class="shrink-0"
              @click="createOpen = true"
            >
              <Plus class="mr-1.5 size-4" />
              Tambah
            </Button>
          </template>
          <template #header-right>
            <div class="flex items-end">
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-0 sm:[&>*:not(:first-child)]:-ml-px sm:[&>*:not(:first-child)_:is(button,input)]:rounded-l-none sm:[&>*:not(:last-child)_:is(button,input)]:rounded-r-none sm:[&>*:focus-within]:z-10"
              >
                <PackageFilterFields
                  v-model:subject-id="subjectId"
                  v-model:grade-id="gradeId"
                  v-model:status="status"
                  :subjects="subjectOptions"
                  :grades="gradeOptions"
                />
              </div>
              <SearchInput
                v-model="search"
                class="sm:w-40"
                label="Cari paket"
              />
            </div>
          </template>
          <template #mobile-toolbar>
            <SearchInput
              v-model="search"
              label="Cari paket"
              class="w-full"
            />
          </template>
          <template #mobile-filter>
            <Button
              variant="outline"
              class="relative shrink-0"
              @click="filterOpen = true"
            >
              <Filter class="mr-1.5 size-4" />
              Filter
              <span
                v-if="activeFiltersCount"
                class="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
              >
                {{ activeFiltersCount }}
              </span>
            </Button>
          </template>
          <template #empty>
            <div class="space-y-3">
              <p>
                {{
                  activeFiltersCount || search
                    ? 'Tidak ada paket yang cocok dengan filter.'
                    : 'Belum ada paket soal.'
                }}
              </p>
              <Button
                v-if="activeFiltersCount || search"
                variant="outline"
                @click="resetAllFilters"
              >
                Atur Ulang
              </Button>
            </div>
          </template>
        </DataTable>
      </div>
    </Card>

    <Dialog v-model:open="filterOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Filter Paket</DialogTitle>
          <DialogDescription class="sr-only">
            Pilih mapel, tingkat, dan status paket.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <PackageFilterFields
            v-model:subject-id="subjectId"
            v-model:grade-id="gradeId"
            v-model:status="status"
            :subjects="subjectOptions"
            :grades="gradeOptions"
          />
        </DialogBody>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            variant="outline"
            @click="resetFilters"
          >
            Atur Ulang
          </Button>
          <Button @click="filterOpen = false">Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <PackageCreateDialog
      v-if="createOpen"
      v-model:open="createOpen"
      @created="router.push(`/exam/packages/${$event}`)"
    />
  </div>
</template>
