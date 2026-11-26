<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { myDashboardApi } from '../api/myDashboardApi'
import DashboardCard from './DashboardCard.vue'

const query = useQuery({
  queryKey: ['dashboard', 'institution'],
  queryFn: async () =>
    (await myDashboardApi.getInstitutionDashboard()).data.data,
})

const completeness = computed(() => query.data.value?.scoreCompleteness ?? [])
const percent = (filled: number, expected: number) =>
  expected === 0 ? 0 : Math.round((filled / expected) * 100)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Dasbor</CardTitle>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <dl
          v-if="query.data.value?.semester"
          class="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-4 py-2"
        >
          <div class="flex flex-col gap-0.5">
            <dt class="text-control text-muted-foreground">Semester Aktif</dt>
            <dd class="font-medium">{{ query.data.value.semester.name }}</dd>
          </div>
        </dl>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DashboardCard
            title="Kelengkapan Nilai per Kelas"
            :loading="query.isPending.value"
            :error="query.isError.value"
            :empty="completeness.length === 0"
            empty-text="Belum ada penilaian semester ini."
          >
            <ul class="space-y-1">
              <li
                v-for="row in completeness"
                :key="row.classroomId"
                class="flex justify-between"
              >
                <span>{{ row.classroomName }}</span>
                <span class="font-medium tabular-nums">
                  {{ row.filled }}/{{ row.expected }} ({{
                    percent(row.filled, row.expected)
                  }}%)
                </span>
              </li>
            </ul>
          </DashboardCard>

          <DashboardCard
            title="Kehadiran Siswa Hari Ini"
            :loading="query.isPending.value"
            :error="query.isError.value"
          >
            <dl class="grid grid-cols-2 gap-2">
              <dt>Hadir</dt>
              <dd class="font-medium tabular-nums">
                {{ query.data.value?.attendanceToday.present }}
              </dd>
              <dt>Sakit</dt>
              <dd class="font-medium tabular-nums">
                {{ query.data.value?.attendanceToday.sick }}
              </dd>
              <dt>Izin</dt>
              <dd class="font-medium tabular-nums">
                {{ query.data.value?.attendanceToday.permit }}
              </dd>
              <dt>Alpa</dt>
              <dd class="font-medium tabular-nums">
                {{ query.data.value?.attendanceToday.absent }}
              </dd>
            </dl>
          </DashboardCard>

          <DashboardCard
            title="Rapor Semester Ini"
            :loading="query.isPending.value"
            :error="query.isError.value"
          >
            <dl class="grid grid-cols-2 gap-2">
              <dt>Dipublikasikan</dt>
              <dd class="font-medium tabular-nums">
                {{ query.data.value?.examScores.published }}
              </dd>
              <dt>Belum dipublikasikan</dt>
              <dd class="font-medium tabular-nums">
                {{ query.data.value?.examScores.unpublished }}
              </dd>
            </dl>
          </DashboardCard>
        </div>
      </CardContent>
      <CardFooter plain />
    </Card>
  </div>
</template>
