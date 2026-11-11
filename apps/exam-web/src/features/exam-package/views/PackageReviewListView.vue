<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { buildReviewColumns } from '../components/reviewPackageColumns'
import { usePackageList } from '../composables/usePackageList'
import { examPackageService } from '../services/examPackageService'
import { useExamPackageStore } from '../stores/examPackageStore'
import type { ExamPackageSummary } from '../types'

const router = useRouter()
const store = useExamPackageStore()

const search = ref('')
const subjectId = ref('ALL')
const gradeId = ref('ALL')
const status = ref('SUBMITTED')
const page = ref(1)
const pageSize = ref(10)

const { packages, totalItems, loading, listError, filtersPending, refresh } =
  usePackageList({ search, subjectId, gradeId, status }, page, pageSize)

watch(search, () => (page.value = 1), { flush: 'sync' })

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

function openPackage(pkg: ExamPackageSummary) {
  void router.push(`/exam/package-approvals/${pkg.id}`)
}

const columns = computed(() =>
  buildReviewColumns({
    subjectName: store.subjectName,
    gradeName: store.gradeName,
    onOpen: openPackage,
  }),
)

onMounted(() => examPackageService.loadReferences())
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader variant="muted">
        <CardTitle class="font-semibold">Persetujuan Paket Soal</CardTitle>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto pt-2 px-4 pb-4"
      >
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
          <template #header-right>
            <SearchInput
              v-model="search"
              class="sm:w-40"
              label="Cari paket"
            />
          </template>
          <template #mobile-toolbar>
            <SearchInput
              v-model="search"
              label="Cari paket"
              class="w-full"
            />
          </template>
          <template #empty>
            <p>
              {{
                search
                  ? 'Tidak ada paket yang cocok.'
                  : 'Tidak ada paket yang menunggu tinjauan.'
              }}
            </p>
          </template>
        </DataTable>
      </CardContent>
      <CardFooter variant="thin" />
    </Card>
  </div>
</template>
