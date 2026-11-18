<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Filter } from '@lucide/vue'
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@mts241alikhlash/ui/card'
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
import type { AcceptableValue } from '@mts241alikhlash/ui/select'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { buildRoomReportColumns } from '../components/roomReportColumns'
import { examEventService } from '../../exam-event/services/examEventService'
import { examRoomService } from '../services/examRoomService'
import type { RoomReportSummary } from '../types'

const router = useRouter()
const reports = ref<RoomReportSummary[]>([])
const events = ref<{ id: string; name: string; status: string }[]>([])
const eventId = ref('')
const eventFieldId = useId()
const mobileEventFieldId = useId()
const filterOpen = ref(false)
const search = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(10)

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Berita Acara', href: '/exam/reports' },
])

const filteredReports = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id')
  if (!keyword) return reports.value
  return reports.value.filter((row) =>
    [row.roomCode, row.roomName].some((value) =>
      value.toLocaleLowerCase('id').includes(keyword),
    ),
  )
})

const paginatedReports = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredReports.value.slice(start, start + pageSize.value)
})

const activeEventName = computed(
  () => events.value.find((event) => event.id === eventId.value)?.name ?? '',
)

const columns = computed(() =>
  buildRoomReportColumns({
    onPrint: (row) =>
      void router.push(`/exam/rooms/${row.roomId}/reports/${row.slotId}/print`),
  }),
)

watch(
  search,
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)

watch([filteredReports, loading], () => {
  if (loading.value) return
  const lastPage = Math.max(
    1,
    Math.ceil(filteredReports.value.length / pageSize.value),
  )
  if (page.value > lastPage) page.value = lastPage
})

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

async function loadReports() {
  loading.value = true
  const result = await examRoomService.loadReports(eventId.value || undefined)
  loading.value = false
  if (result.success) {
    reports.value = result.data
    error.value = null
  } else {
    reports.value = []
    error.value = result.error
  }
}

async function changeEvent(value: AcceptableValue) {
  eventId.value = typeof value === 'string' ? value : ''
  page.value = 1
  await loadReports()
}

async function load() {
  loading.value = true
  try {
    const result = await examEventService.loadEvents({ limit: 200 })
    if (result.success) {
      events.value = result.data.map((event) => ({
        id: event.id,
        name: event.name,
        status: event.status,
      }))
      const active = result.data.find((event) => event.status === 'ACTIVE')
      eventId.value = active?.id ?? result.data[0]?.id ?? ''
    }
  } catch {
    error.value = 'Periode ujian tidak dapat dimuat.'
  }
  await loadReports()
}

onMounted(load)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Berita Acara</CardTitle>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto pt-2 px-4 pb-4"
      >
        <div
          v-if="error"
          class="m-4 space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-control">{{ error }}</p>
          <Button
            variant="outline"
            @click="loadReports"
          >
            Coba lagi
          </Button>
        </div>
        <template v-else>
          <DataTable
            mobile="cards"
            :columns="columns"
            :data="paginatedReports"
            :page="page"
            :page-size="pageSize"
            :total-items="filteredReports.length"
            :is-loading="loading"
            item-label="berita acara"
            @update:page="page = $event"
            @update:page-size="changePageSize"
          >
            <template #filters>
              <FloatingLabelField
                label="Periode Ujian"
                :for="eventFieldId"
                class="w-fit min-w-40"
                floating
              >
                <Select
                  :model-value="eventId"
                  @update:model-value="changeEvent"
                >
                  <SelectTrigger
                    :id="eventFieldId"
                    class="w-full"
                  >
                    <SelectValue placeholder="Pilih periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="event in events"
                      :key="event.id"
                      :value="event.id"
                    >
                      {{ event.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FloatingLabelField>
            </template>
            <template #header-right>
              <SearchInput
                v-model="search"
                class="sm:w-40"
                label="Cari ruangan"
              />
            </template>
            <template #mobile-toolbar>
              <SearchInput
                v-model="search"
                label="Cari ruangan"
                class="w-full"
              />
            </template>
            <template #mobile-filter>
              <Button
                variant="outline"
                class="shrink-0"
                @click="filterOpen = true"
              >
                <Filter class="size-4" />
                Filter
              </Button>
            </template>
            <template #mobile-chips>
              <div
                v-if="activeEventName"
                class="flex flex-wrap gap-2 text-control"
              >
                <Button
                  variant="outline"
                  class="max-w-full"
                  :title="`Hapus filter periode: ${activeEventName}`"
                  @click="changeEvent('')"
                >
                  <span class="truncate">Hapus filter periode</span>
                </Button>
              </div>
            </template>
            <template #empty>
              <div class="space-y-3 text-center">
                <p>
                  {{
                    search
                      ? 'Tidak ada berita acara yang cocok dengan pencarian.'
                      : 'Belum ada jadwal pengawasan pada periode ini.'
                  }}
                </p>
                <Button
                  v-if="search"
                  variant="outline"
                  @click="search = ''"
                >
                  Atur Ulang
                </Button>
              </div>
            </template>
          </DataTable>
        </template>
      </CardContent>
      <CardFooter plain />
    </Card>

    <Dialog v-model:open="filterOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Filter Berita Acara</DialogTitle>
          <DialogDescription>
            Pilih periode ujian yang berita acaranya ingin dilihat.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <FloatingLabelField
            label="Periode Ujian"
            :for="mobileEventFieldId"
            floating
          >
            <Select
              :model-value="eventId"
              @update:model-value="
                (value) => {
                  filterOpen = false
                  changeEvent(value)
                }
              "
            >
              <SelectTrigger
                :id="mobileEventFieldId"
                class="w-full"
              >
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="event in events"
                  :key="event.id"
                  :value="event.id"
                >
                  {{ event.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
        </DialogBody>
        <DialogFooter standard>
          <Button
            variant="outline"
            @click="filterOpen = false"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
