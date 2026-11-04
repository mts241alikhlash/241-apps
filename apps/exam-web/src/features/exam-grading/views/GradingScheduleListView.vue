<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Card } from '@mts241alikhlash/ui/card'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import MakeupDialog from '@/features/exam-schedule/components/MakeupDialog.vue'
import MakeupParticipantsDialog from '@/features/exam-schedule/components/MakeupParticipantsDialog.vue'
import type { MakeupOrigin } from '@/features/exam-schedule/types'
import type { GradingSchedule } from '../types'
import { buildGradingScheduleColumns } from '../components/gradingColumns'
import { useGradingSchedules } from '../composables/useGradingLists'

const router = useRouter()
const { hasPermission } = useAuthSession()
const makeupTarget = ref<MakeupOrigin | null>(null)
const participantsTarget = ref<GradingSchedule | null>(null)

function originOf(schedule: GradingSchedule): MakeupOrigin {
  return {
    id: schedule.id,
    packageId: schedule.packageId,
    packageTitle: schedule.title,
    classroomName: schedule.classroomName,
    durationMinutes: schedule.durationMinutes,
    endsAt: schedule.endsAt,
  }
}
const page = ref(1)
const pageSize = ref(10)

const { schedules, totalItems, loading, listError, refresh } =
  useGradingSchedules(page, pageSize)

const columns = computed(() =>
  buildGradingScheduleColumns({
    canMakeup: hasPermission('exam-grading.grade'),
    canParticipants: hasPermission('exam-grading.read'),
    onMakeup: (schedule) => {
      makeupTarget.value = originOf(schedule)
    },
    onParticipants: (schedule) => {
      participantsTarget.value = schedule
    },
    onOpen: (schedule) =>
      void router.push({
        path: `/exam/grading/${schedule.id}`,
        query: { judul: schedule.title },
      }),
  }),
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
          :data="schedules"
          :page="page"
          :page-size="pageSize"
          :total-items="totalItems"
          :is-loading="loading"
          item-label="ujian"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #empty>
            <p>Belum ada ujian yang dikerjakan siswa kelas Anda.</p>
          </template>
        </DataTable>
      </div>
    </Card>

    <MakeupDialog
      v-if="makeupTarget"
      :open="true"
      :schedule="makeupTarget"
      @update:open="(value: boolean) => !value && (makeupTarget = null)"
      @created="refresh()"
    />

    <MakeupParticipantsDialog
      v-if="participantsTarget"
      :open="true"
      :schedule-id="participantsTarget.id"
      :title="`${participantsTarget.title} · ${participantsTarget.classroomName ?? '-'}`"
      @update:open="(value: boolean) => !value && (participantsTarget = null)"
    />
  </div>
</template>
