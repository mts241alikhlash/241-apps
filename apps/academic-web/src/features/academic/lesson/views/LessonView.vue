<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { DataTable } from '@mts241alikhlash/ui'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { createLessonColumns } from '../components/columns'
import { useLessonClassrooms } from '../composables/useLessonClassrooms'
import type { LessonClassItem } from '../types'

const router = useRouter()
const {
  classrooms,
  loading: isLoading,
  fetchClassrooms,
} = useLessonClassrooms()

const tableColumns = createLessonColumns({
  onManageSchedule: (cls: LessonClassItem) => {
    void router.push({
      name: 'classroom-schedule-editor',
      params: { classroomId: cls.id },
    })
  },
})

onMounted(() => {
  void fetchClassrooms()
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
        <CardTitle size="lg"> Jadwal Pelajaran </CardTitle>
      </CardHeader>
      <CardContent class="p-0 sm:px-0">
        <DataTable
          :columns="tableColumns"
          :data="classrooms"
          :is-loading="isLoading"
          item-label="kelas"
          filter-column="code"
          filter-placeholder="Cari kelas..."
        />
      </CardContent>
    </Card>
  </div>
</template>
