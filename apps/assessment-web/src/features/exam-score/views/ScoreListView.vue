<script setup lang="ts">
import { ref } from 'vue'
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Card } from '@mts241alikhlash/ui/card'
import { buildScoreColumns } from '../components/scoreColumns'
import { useScoreList } from '../composables/useScoreList'

const page = ref(1)
const pageSize = ref(10)
const columns = buildScoreColumns()

const { scores, totalItems, loading, listError, refresh } = useScoreList(
  page,
  pageSize,
)

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}
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
          <template #empty>
            <p>Belum ada nilai ujian yang terkirim untuk kelas Anda.</p>
          </template>
        </DataTable>
      </div>
    </Card>
  </div>
</template>
