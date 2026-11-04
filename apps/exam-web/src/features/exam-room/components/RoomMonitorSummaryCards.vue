<script setup lang="ts">
import { computed } from 'vue'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import type { RoomMonitorSummary } from '../types'

const props = defineProps<{ summary: RoomMonitorSummary | null }>()

const cards = computed(() => {
  const summary = props.summary
  if (summary === null) return []
  return [
    { key: 'total', label: 'Total', value: summary.totalRegistered },
    {
      key: 'not-started',
      label: 'Belum Mulai',
      value: summary.notStartedCount,
    },
    {
      key: 'in-progress',
      label: 'Mengerjakan',
      value: summary.inProgressCount,
    },
    {
      key: 'unsynced',
      label: 'Menunggu Sinkron',
      value: summary.offlineOrUnsyncedCount,
    },
    {
      key: 'locked',
      label: 'Perlu Tindakan',
      value: summary.lockedOrViolationCount,
    },
    { key: 'finished', label: 'Selesai', value: summary.finishedCount },
    { key: 'absent', label: 'Tidak Hadir', value: summary.absentMarkedCount },
  ]
})
</script>

<template>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
    <Card
      v-for="card in cards"
      :key="card.key"
      gap="none"
    >
      <CardHeader standard>
        <CardTitle
          size="md"
          class="text-muted-foreground"
        >
          {{ card.label }}
        </CardTitle>
      </CardHeader>
      <CardContent variant="standard">
        <p class="text-lg font-semibold tabular-nums">{{ card.value }}</p>
      </CardContent>
    </Card>
  </div>
</template>
