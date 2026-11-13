<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Plus } from '@lucide/vue'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { semesterApi } from '@/features/lookup/semester'
import { buildEventColumns } from '../components/eventColumns'
import EventFormDialog from '../components/EventFormDialog.vue'
import { useEventList } from '../composables/useEventList'
import { EVENT_STATUSES, eventStatusLabel } from '../types'
import type { ExamEvent } from '../types'

const router = useRouter()
const { hasPermission } = useAuthSession()

const status = ref('ALL')
const semesterId = ref('')
const page = ref(1)
const pageSize = ref(10)
const semesters = ref<{ id: string; label: string }[]>([])
const formOpen = ref(false)
const editing = ref<ExamEvent | null>(null)

const { events, totalItems, loading, listError, filtersPending, refresh } =
  useEventList({ status, semesterId }, page, pageSize)

const canManage = computed(() => hasPermission('exam-events.manage'))

const columns = computed(() =>
  buildEventColumns({
    canManage: canManage.value,
    onOpen: (event) => void router.push(`/exam/events/${event.id}`),
    onEdit: (event) => {
      editing.value = event
      formOpen.value = true
    },
    onRooms: (event) => void router.push(`/exam/events/${event.id}`),
  }),
)

function openCreate() {
  editing.value = null
  formOpen.value = true
}

watch(
  [status, semesterId],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

const canReadSemesters = computed(() => hasPermission('semesters.read'))

onMounted(async () => {
  try {
    if (!canReadSemesters.value) return
    const response = await semesterApi.getSemesters({ limit: 100 })
    semesters.value = response.data.map((semester) => ({
      id: semester.id,
      label: `${semester.academicYear?.name ?? '-'} · ${semester.type?.name ?? '-'}${semester.isActive ? ' (aktif)' : ''}`,
    }))
    const active = response.data.find((semester) => semester.isActive)
    if (active) semesterId.value = active.id
  } catch {
    semesters.value = []
  } finally {
    await refresh()
  }
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader variant="muted">
        <CardTitle class="font-semibold">Kegiatan Ujian</CardTitle>
        <Button
          v-if="canManage && semesterId"
          class="shrink-0"
          @click="openCreate"
        >
          <Plus class="mr-1.5 size-4" />
          Tambah
        </Button>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto pt-2 px-4 pb-4"
      >
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
          :data="filtersPending ? [] : events"
          :page="page"
          :page-size="pageSize"
          :total-items="totalItems"
          :is-loading="loading || filtersPending"
          item-label="kegiatan"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #filters>
            <div class="flex flex-wrap gap-2">
              <FloatingLabelField
                label="Semester"
                :for="'event-semester'"
                class="w-fit min-w-52"
                floating
              >
                <Select v-model="semesterId">
                  <SelectTrigger
                    id="event-semester"
                    class="w-full"
                  >
                    <SelectValue placeholder="Pilih semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="semester in semesters"
                      :key="semester.id"
                      :value="semester.id"
                    >
                      {{ semester.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FloatingLabelField>
              <FloatingLabelField
                label="Status"
                :for="'event-status'"
                class="w-fit min-w-32"
                floating
              >
                <Select v-model="status">
                  <SelectTrigger
                    id="event-status"
                    class="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua</SelectItem>
                    <SelectItem
                      v-for="option in EVENT_STATUSES"
                      :key="option"
                      :value="option"
                    >
                      {{ eventStatusLabel(option) }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FloatingLabelField>
            </div>
          </template>
          <template #empty>
            <p>Belum ada kegiatan ujian pada semester ini.</p>
          </template>
        </DataTable>
      </CardContent>
      <CardFooter variant="thin" />
    </Card>

    <EventFormDialog
      v-if="formOpen"
      v-model:open="formOpen"
      :semester-id="semesterId"
      :event="editing"
      @saved="refresh()"
    />
  </div>
</template>
