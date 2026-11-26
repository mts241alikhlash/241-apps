<script setup lang="ts">
import { DataTable, DataTableEmpty } from '@mts241alikhlash/ui'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { createMyRaporColumns } from '../components/myRaporColumns'
import RaporDetailDialog from '../components/RaporDetailDialog.vue'
import { raporService } from '../services/raporService'
import { useRaporStore } from '../stores/raporStore'
import type { RaporData } from '../types'

const store = useRaporStore()
const { rapors, loading, summary } = storeToRefs(store)

const detailOpen = ref(false)
const selected = ref<RaporData | null>(null)

function openDetail(rapor: RaporData) {
  selected.value = rapor
  detailOpen.value = true
}

const tableColumns = createMyRaporColumns(openDetail)

onMounted(() => void raporService.fetchMine())
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Rapor Saya</CardTitle>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <dl
          v-if="
            summary && summary.published > 0 && summary.averageScore !== null
          "
          class="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-4 py-2"
        >
          <div class="flex flex-col gap-0.5">
            <dt class="text-control text-muted-foreground">Rata-rata</dt>
            <dd class="font-medium tabular-nums">
              {{ summary.averageScore.toFixed(2) }}
            </dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="text-control text-muted-foreground">Rapor Terbit</dt>
            <dd class="font-medium tabular-nums">{{ summary.published }}</dd>
          </div>
        </dl>

        <DataTable
          mobile="cards"
          :columns="tableColumns"
          :data="rapors"
          :is-loading="loading"
          item-label="rapor"
          hide-per-page
          :row-clickable="() => true"
          @row-click="openDetail"
        >
          <template #empty>
            <DataTableEmpty
              message="Belum ada rapor yang diterbitkan untuk Anda. Rapor akan muncul di sini setelah wali kelas menerbitkannya."
            />
          </template>
        </DataTable>
      </CardContent>
      <CardFooter plain />
    </Card>

    <RaporDetailDialog
      v-model:open="detailOpen"
      :rapor="selected"
      scope="own"
    />
  </div>
</template>
