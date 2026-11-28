<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { DataTable, DataTableEmpty } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { buildOfflineScheduleColumns } from '../components/offlineScoreColumns'
import { useOfflineSchedules } from '../composables/useOfflineSchedules'
import { OFFLINE_SCORES_PATH, type OfflineSchedule } from '../types'

const router = useRouter()
const { schedules, loading, listError, refresh } = useOfflineSchedules()
const page = ref(1)
const pageSize = ref(25)

const open = (schedule: OfflineSchedule) =>
  void router.push(`${OFFLINE_SCORES_PATH}/${schedule.scheduleId}`)

const columns = buildOfflineScheduleColumns({ onOpen: open })

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Nilai Offline</CardTitle>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto pt-2 px-4 pb-4"
      >
        <div
          v-if="listError"
          class="space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-control">{{ listError }}</p>
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
          :data="schedules"
          :page="page"
          :page-size="pageSize"
          :is-loading="loading"
          item-label="ujian"
          @row-click="open"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #empty>
            <DataTableEmpty message="Belum ada ujian offline untuk dinilai." />
          </template>
        </DataTable>
      </CardContent>
      <CardFooter plain />
    </Card>
  </div>
</template>
