<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
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
  <div class="space-y-6 px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <p
      v-if="query.data.value?.semester"
      class="text-muted-foreground"
    >
      Semester aktif: {{ query.data.value.semester.name }}
    </p>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DashboardCard
        title="Kelengkapan Nilai per Kelas"
        :loading="query.isPending.value"
        :error="query.isError.value"
        :empty="completeness.length === 0"
        empty-text="Belum ada penilaian semester ini."
      >
        <ul class="space-y-1 tabular-nums">
          <li
            v-for="row in completeness"
            :key="row.classroomId"
            class="flex justify-between"
          >
            <span>{{ row.classroomName }}</span>
            <span class="font-medium">
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
        <dl class="grid grid-cols-2 gap-2 tabular-nums">
          <dt>Hadir</dt>
          <dd class="font-medium">
            {{ query.data.value?.attendanceToday.present }}
          </dd>
          <dt>Sakit</dt>
          <dd class="font-medium">
            {{ query.data.value?.attendanceToday.sick }}
          </dd>
          <dt>Izin</dt>
          <dd class="font-medium">
            {{ query.data.value?.attendanceToday.permit }}
          </dd>
          <dt>Alpa</dt>
          <dd class="font-medium">
            {{ query.data.value?.attendanceToday.absent }}
          </dd>
        </dl>
      </DashboardCard>

      <DashboardCard
        title="Rapor Semester Ini"
        :loading="query.isPending.value"
        :error="query.isError.value"
      >
        <dl class="grid grid-cols-2 gap-2 tabular-nums">
          <dt>Dipublikasikan</dt>
          <dd class="font-medium">
            {{ query.data.value?.examScores.published }}
          </dd>
          <dt>Belum dipublikasikan</dt>
          <dd class="font-medium">
            {{ query.data.value?.examScores.unpublished }}
          </dd>
        </dl>
      </DashboardCard>
    </div>
  </div>
</template>
