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
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import { buildRoomSummaryColumns } from '../components/roomSummaryColumns'
import type { RoomSummary } from '../components/roomSummaryColumns'
import { examEventService } from '../services/examEventService'

const props = defineProps<{
  title: string
  detailBase: string
}>()

const router = useRouter()
const { hasPermission } = useAuthSession()
const semesterId = ref('')
const rows = ref<RoomSummary[]>([])
const loading = ref(false)
const loadFailed = ref(false)

const columns = computed(() =>
  buildRoomSummaryColumns({
    onOpen: (event) => void router.push(`${props.detailBase}/${event.id}`),
  }),
)

async function load() {
  loading.value = true
  loadFailed.value = false
  const list = await examEventService.loadEvents({
    limit: 100,
    semesterId: semesterId.value || undefined,
  })
  if (!list.success) {
    rows.value = []
    loadFailed.value = true
    loading.value = false
    return
  }
  rows.value = await Promise.all(
    list.data.map(async (event) => {
      const rooms = await examEventService.loadRooms(event.id)
      return { event, rooms: rooms.success ? rooms.data : [] }
    }),
  )
  loading.value = false
}

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Persiapan', href: '#' },
  { title: props.title },
])

watch(semesterId, load)

onMounted(() => {
  if (!hasPermission('semesters.read')) void load()
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">{{ title }}</CardTitle>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4 sm:p-4"
      >
        <AcademicPeriodFilter v-model:semester-id="semesterId" />
        <div
          v-if="loadFailed"
          class="space-y-3"
          role="alert"
        >
          <p class="text-control">Periode ujian tidak dapat dimuat.</p>
          <Button
            variant="outline"
            @click="load()"
          >
            Coba lagi
          </Button>
        </div>
        <DataTable
          v-else
          mobile="cards"
          hide-pagination
          :columns="columns"
          :data="rows"
          :is-loading="loading"
          item-label="periode ujian"
        >
          <template #empty>
            <p>Belum ada periode ujian.</p>
          </template>
        </DataTable>
      </CardContent>
      <CardFooter plain />
    </Card>
  </div>
</template>
