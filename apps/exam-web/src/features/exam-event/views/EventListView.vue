<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { DataTable, DataTableEmpty } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import { buildEventColumns } from '../components/eventColumns'
import EventFormDialog from '../components/EventFormDialog.vue'
import { useEventList } from '../composables/useEventList'
import { EVENT_STATUSES, eventStatusLabel } from '../types'
import type { ExamEvent } from '../types'

const { hasPermission } = useAuthSession()

const status = ref('ALL')
const semesterId = ref('')
const page = ref(1)
const pageSize = ref(25)
const formOpen = ref(false)
const editing = ref<ExamEvent | null>(null)

const { events, totalItems, loading, listError, filtersPending, refresh } =
  useEventList({ status, semesterId }, page, pageSize)

const canManage = computed(() => hasPermission('exam-events.manage'))

const columns = computed(() =>
  buildEventColumns({
    canManage: canManage.value,
    onEdit: (event) => {
      editing.value = event
      formOpen.value = true
    },
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

onMounted(refresh)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Periode Ujian</CardTitle>
        <Button
          v-if="canManage && semesterId"
          class="shrink-0"
          @click="openCreate"
        >
          <Plus class="size-4" />
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
          <p class="text-control">
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
          item-label="periode ujian"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #filters>
            <AcademicPeriodFilter v-model:semester-id="semesterId" />
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
          </template>
          <template #empty>
            <DataTableEmpty
              message="Belum ada periode ujian pada semester ini."
            />
          </template>
        </DataTable>
      </CardContent>
      <CardFooter plain />
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
