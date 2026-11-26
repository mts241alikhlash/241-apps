<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Filter } from '@lucide/vue'
import { DataTable, DataTableEmpty } from '@mts241alikhlash/ui'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { buildScoreColumns } from '../components/scoreColumns'
import { useScoreList } from '../composables/useScoreList'

const page = ref(1)
const pageSize = ref(10)
const semesterId = ref('')
const filterOpen = ref(false)
const columns = buildScoreColumns()

const { scores, totalItems, loading, listError, refresh } = useScoreList(
  page,
  pageSize,
  semesterId,
)

const activeFiltersCount = computed(() => Number(Boolean(semesterId.value)))

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

watch(
  semesterId,
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Nilai Ujian</CardTitle>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <div
          v-if="listError"
          class="space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-control">
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
          :columns="columns"
          :data="scores"
          :page="page"
          :page-size="pageSize"
          :total-items="totalItems"
          :is-loading="loading"
          item-label="nilai"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #filters>
            <AcademicPeriodFilter v-model:semester-id="semesterId" />
          </template>
          <template #mobile-filter>
            <Button
              variant="outline"
              class="relative shrink-0"
              @click="filterOpen = true"
            >
              <Filter class="size-4" />
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
            <DataTableEmpty
              message="Belum ada nilai ujian yang terkirim untuk semester ini."
            />
          </template>
        </DataTable>
      </CardContent>
      <CardFooter plain />
    </Card>

    <Dialog v-model:open="filterOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Filter Nilai Ujian</DialogTitle>
          <DialogDescription>
            Pilih tahun ajaran dan semester untuk menampilkan nilai ujian.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <AcademicPeriodFilter
            v-model:semester-id="semesterId"
            full-width
          />
        </DialogBody>
        <DialogFooter standard>
          <Button @click="filterOpen = false"> Tutup </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
