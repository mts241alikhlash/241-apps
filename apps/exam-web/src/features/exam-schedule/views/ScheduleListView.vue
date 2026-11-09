<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import { DataTable } from '@mts241alikhlash/ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mts241alikhlash/ui/alert-dialog'
import { Button } from '@mts241alikhlash/ui/button'
import { Card } from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Filter, Plus } from '@lucide/vue'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { buildScheduleColumns } from '../components/scheduleColumns'
import MakeupDialog from '../components/MakeupDialog.vue'
import MakeupParticipantsDialog from '../components/MakeupParticipantsDialog.vue'
import AccessCodeDialog from '../components/AccessCodeDialog.vue'
import ScheduleFormDialog from '../components/ScheduleFormDialog.vue'
import { useScheduleList } from '../composables/useScheduleList'
import { examScheduleService } from '../services/examScheduleService'
import { SCHEDULE_STATUSES, scheduleStatusLabel } from '../types'
import type { ExamSchedule } from '../types'

const router = useRouter()
const { hasPermission } = useAuthSession()

const status = ref('ALL')
const page = ref(1)
const pageSize = ref(10)

const { schedules, totalItems, loading, listError, filtersPending, refresh } =
  useScheduleList({ status }, page, pageSize)

watch(
  status,
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)

const statusFieldId = useId()
const formOpen = ref(false)
const filterOpen = ref(false)
const editing = ref<ExamSchedule | null>(null)
const cancelTarget = ref<ExamSchedule | null>(null)
const accessTarget = ref<ExamSchedule | null>(null)
const makeupTarget = ref<ExamSchedule | null>(null)
const participantsTarget = ref<ExamSchedule | null>(null)
const cancelling = ref(false)

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(schedule: ExamSchedule) {
  editing.value = schedule
  formOpen.value = true
}

async function confirmCancel() {
  const target = cancelTarget.value
  if (!target) return
  cancelling.value = true
  const done = await examScheduleService.cancelSchedule(target.id)
  cancelling.value = false
  if (done) {
    cancelTarget.value = null
    await refresh()
  }
}

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

const columns = computed(() =>
  buildScheduleColumns({
    canUpdate: hasPermission('exam-schedules.update'),
    canCancel: hasPermission('exam-schedules.cancel'),
    canAccessCode: hasPermission('exam-schedules.access-code'),
    canSessions: hasPermission('exam-sessions.read'),
    canMakeup: hasPermission('exam-grading.grade'),
    canParticipants: hasPermission('exam-grading.read'),
    canManageActivity: hasPermission('exam-schedules.manage'),
    now: () => new Date(),
    onEdit: openEdit,
    onCancel: (schedule) => {
      cancelTarget.value = schedule
    },
    onAccessCode: (schedule) => {
      accessTarget.value = schedule
    },
    onSessions: (schedule) => {
      void router.push({
        path: `/exam/schedules/${schedule.id}/sessions`,
        query: {
          judul: `${schedule.packageTitle} · ${schedule.classroomName ?? '-'}`,
        },
      })
    },
    onMakeup: (schedule) => {
      makeupTarget.value = schedule
    },
    onParticipants: (schedule) => {
      participantsTarget.value = schedule
    },
    onStatus: (schedule) => {
      if (schedule.activityId === null) return
      void router.push({
        path: '/exam/activities/new',
        query: { id: schedule.activityId },
      })
    },
  }),
)
</script>

<template>
  <div class="px-2 pb-4 pt-1 sm:px-2 sm:pb-6 sm:pt-1">
    <Card gap="none">
      <div class="space-y-4 p-4 sm:p-6">
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
          :data="filtersPending ? [] : schedules"
          :page="page"
          :page-size="pageSize"
          :total-items="totalItems"
          :is-loading="loading || filtersPending"
          item-label="jadwal"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #header-left>
            <Button
              v-if="hasPermission('exam-schedules.create')"
              class="shrink-0"
              @click="openCreate"
            >
              <Plus class="mr-1.5 size-4" />
              Tambah
            </Button>
          </template>
          <template #header-right>
            <FloatingLabelField
              label="Status"
              :for="statusFieldId"
              class="w-fit min-w-28"
              floating
            >
              <Select v-model="status">
                <SelectTrigger
                  :id="statusFieldId"
                  class="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem
                    v-for="option in SCHEDULE_STATUSES"
                    :key="option"
                    :value="option"
                  >
                    {{ scheduleStatusLabel(option) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>
          </template>
          <template #mobile-filter>
            <Button
              variant="outline"
              class="relative shrink-0"
              @click="filterOpen = true"
            >
              <Filter class="mr-1.5 size-4" />
              Filter
              <span
                v-if="status !== 'ALL'"
                class="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
              >
                1
              </span>
            </Button>
          </template>
          <template #empty>
            <div class="space-y-3">
              <p>
                {{
                  status !== 'ALL'
                    ? 'Tidak ada jadwal yang cocok dengan filter.'
                    : 'Belum ada jadwal ujian.'
                }}
              </p>
              <Button
                v-if="status !== 'ALL'"
                variant="outline"
                @click="status = 'ALL'"
              >
                Atur Ulang
              </Button>
            </div>
          </template>
        </DataTable>
      </div>
    </Card>

    <Dialog v-model:open="filterOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Filter Jadwal</DialogTitle>
          <DialogDescription class="sr-only">
            Pilih status jadwal.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <FloatingLabelField
            label="Status"
            :for="`${statusFieldId}-dialog`"
            floating
          >
            <Select v-model="status">
              <SelectTrigger
                :id="`${statusFieldId}-dialog`"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                <SelectItem
                  v-for="option in SCHEDULE_STATUSES"
                  :key="option"
                  :value="option"
                >
                  {{ scheduleStatusLabel(option) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
        </DialogBody>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            variant="outline"
            @click="status = 'ALL'"
          >
            Atur Ulang
          </Button>
          <Button @click="filterOpen = false">Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ScheduleFormDialog
      v-if="formOpen"
      v-model:open="formOpen"
      :schedule="editing"
      @saved="refresh()"
    />

    <AccessCodeDialog
      v-if="accessTarget"
      :open="true"
      :schedule-id="accessTarget.id"
      :title="`${accessTarget.packageTitle} · ${accessTarget.classroomName ?? '-'}`"
      @update:open="(value: boolean) => !value && (accessTarget = null)"
    />

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
      :title="`${participantsTarget.packageTitle} · ${participantsTarget.classroomName ?? '-'}`"
      @update:open="(value: boolean) => !value && (participantsTarget = null)"
    />

    <AlertDialog
      :open="cancelTarget !== null"
      @update:open="(value: boolean) => !value && (cancelTarget = null)"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan jadwal?</AlertDialogTitle>
          <AlertDialogDescription>
            Jadwal {{ cancelTarget?.packageTitle }} untuk
            {{ cancelTarget?.classroomName ?? 'kelas ini' }} dibatalkan dan
            tokennya tidak berlaku lagi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Kembali</AlertDialogCancel>
          <AlertDialogAction
            :disabled="cancelling"
            @click="confirmCancel"
          >
            Ya, batalkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
