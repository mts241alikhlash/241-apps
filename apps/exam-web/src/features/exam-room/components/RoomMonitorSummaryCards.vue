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

const items = computed(() => {
  const summary = props.summary
  if (summary === null) return []
  return [
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
      tone: 'text-warning',
    },
    {
      key: 'locked',
      label: 'Perlu Tindakan',
      value: summary.lockedOrViolationCount,
      tone: 'text-destructive',
    },
    { key: 'finished', label: 'Selesai', value: summary.finishedCount },
    { key: 'absent', label: 'Tidak Hadir', value: summary.absentMarkedCount },
  ]
})
</script>

<template>
  <Card gap="none">
    <CardHeader standard>
      <CardTitle size="md">Ringkasan</CardTitle>
    </CardHeader>
    <CardContent variant="standard">
      <dl class="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <div
          v-for="item in items"
          :key="item.key"
          class="flex flex-col gap-0.5"
        >
          <dt class="text-control text-muted-foreground">{{ item.label }}</dt>
          <dd :class="['font-medium', item.value > 0 && item.tone]">
            {{ item.value }}
          </dd>
        </div>
      </dl>
    </CardContent>
  </Card>
</template>
