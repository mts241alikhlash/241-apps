<script setup lang="ts">
import { computed } from 'vue'
import { Card } from '@mts241alikhlash/ui/card'
import { Separator } from '@mts241alikhlash/ui/separator'
import type { SchoolIdentity } from '../types'

const props = defineProps<{ data: SchoolIdentity }>()

const rows = computed(() =>
  [
    { label: 'Status Kepegawaian', value: props.data.employmentStatus },
    { label: 'Jabatan', value: props.data.primaryPosition },
    { label: 'Tugas Tambahan', value: props.data.additionalDuties },
    { label: 'Kategori Jabatan', value: props.data.positionCategory },
    { label: 'Tanggal Mulai', value: props.data.hireDate },
    { label: 'Mata Pelajaran Diampu', value: props.data.taughtSubjects },
    { label: 'Kelas', value: props.data.className },
    { label: 'Tingkat', value: props.data.gradeLevel },
    { label: 'Wali Kelas', value: props.data.supervisorName },
  ].filter((row) => row.value && row.value !== '-'),
)
</script>

<template>
  <Card
    v-if="rows.length > 0"
    class="p-5 gap-0 space-y-3 text-sm"
  >
    <h3 class="text-sm font-semibold">Identitas Sekolah</h3>
    <Separator />
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
      <div
        v-for="row in rows"
        :key="row.label"
        class="flex items-start justify-between gap-2"
      >
        <span class="text-muted-foreground">{{ row.label }}</span>
        <span class="font-medium text-right">{{ row.value }}</span>
      </div>
    </div>
  </Card>
</template>
