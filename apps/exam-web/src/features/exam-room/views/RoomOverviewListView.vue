<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Filter } from '@lucide/vue'
import { DataTable, SearchInput, DataTableEmpty } from '@mts241alikhlash/ui'
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
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { buildRoomOverviewColumns } from '../components/roomOverviewColumns'
import { examRoomService } from '../services/examRoomService'
import type { RoomOverview } from '../types'

const router = useRouter()
const rooms = ref<RoomOverview[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const search = ref('')
const statusFilter = ref<'ALL' | 'ACTIVE' | 'WAITING'>('ALL')
const statusFilterId = useId()
const mobileStatusFilterId = useId()
const filterOpen = ref(false)

const page = ref(1)
const pageSize = ref(25)

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Monitoring', href: '/exam/rooms' },
])

const activeFiltersCount = computed(() => Number(statusFilter.value !== 'ALL'))

const filteredRooms = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id')
  return rooms.value.filter((room) => {
    if (statusFilter.value === 'ACTIVE' && !room.isActiveNow) return false
    if (statusFilter.value === 'WAITING' && room.isActiveNow) return false
    if (!keyword) return true
    return [
      room.code,
      room.name,
      room.building ?? '',
      room.currentSupervisorName ?? '',
      room.technicianName ?? '',
    ].some((v) => v.toLocaleLowerCase('id').includes(keyword))
  })
})

const paginatedRooms = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRooms.value.slice(start, start + pageSize.value)
})

watch(
  [search, statusFilter],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)

watch([filteredRooms, loading], () => {
  if (loading.value) return
  const lastPage = Math.max(
    1,
    Math.ceil(filteredRooms.value.length / pageSize.value),
  )
  if (page.value > lastPage) page.value = lastPage
})

function goToPage(next: number) {
  page.value = next
}

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

function openRoom(room: RoomOverview) {
  void router.push(`/exam/rooms/${room.id}`)
}

const columns = computed(() =>
  buildRoomOverviewColumns({
    onOpen: openRoom,
  }),
)

async function load() {
  loading.value = true
  const result = await examRoomService.loadOverview()
  loading.value = false
  if (result.success) {
    rooms.value = result.data
    error.value = null
  } else {
    error.value = result.error
  }
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
        <CardTitle class="font-semibold">Monitoring</CardTitle>
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
            @click="load"
          >
            Coba lagi
          </Button>
        </div>
        <template v-else>
          <DataTable
            mobile="cards"
            :columns="columns"
            :data="paginatedRooms"
            :page="page"
            :page-size="pageSize"
            :total-items="filteredRooms.length"
            :is-loading="loading"
            item-label="ruangan"
            @update:page="goToPage"
            @update:page-size="changePageSize"
          >
            <template #filters>
              <div
                class="flex items-end sm:gap-0 sm:[&>*:not(:first-child)]:-ml-px sm:[&>*:not(:first-child)_:is(button,input)]:rounded-l-none sm:[&>*:not(:last-child)_:is(button,input)]:rounded-r-none sm:[&>*:focus-within]:z-10"
              >
                <FloatingLabelField
                  label="Status"
                  :for="statusFilterId"
                  class="w-fit min-w-28"
                  floating
                >
                  <Select v-model="statusFilter">
                    <SelectTrigger
                      :id="statusFilterId"
                      class="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua</SelectItem>
                      <SelectItem value="ACTIVE">Berlangsung</SelectItem>
                      <SelectItem value="WAITING">Menunggu</SelectItem>
                    </SelectContent>
                  </Select>
                </FloatingLabelField>
              </div>
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
                class="relative shrink-0"
                @click="filterOpen = true"
              >
                <Filter class="size-4" />
                Filter
                <span
                  v-if="activeFiltersCount"
                  class="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
                >
                  {{ activeFiltersCount }}
                </span>
              </Button>
            </template>

            <template #mobile-chips>
              <div
                v-if="activeFiltersCount"
                class="flex flex-wrap gap-2 text-control"
              >
                <Button
                  v-if="statusFilter !== 'ALL'"
                  variant="outline"
                  @click="statusFilter = 'ALL'"
                >
                  Hapus filter status:
                  {{ statusFilter === 'ACTIVE' ? 'Berlangsung' : 'Menunggu' }}
                </Button>
              </div>
            </template>

            <template #empty>
              <DataTableEmpty
                :message="
                  activeFiltersCount || search
                    ? 'Tidak ada ruangan yang cocok dengan filter.'
                    : 'Belum ada ruangan aktif untuk Anda.'
                "
              />
            </template>
          </DataTable>
        </template>
      </CardContent>
      <CardFooter plain />
    </Card>

    <Dialog v-model:open="filterOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Filter Ruang Ujian</DialogTitle>
          <DialogDescription>
            Filter ruangan berdasarkan status
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <FloatingLabelField
            label="Status"
            :for="mobileStatusFilterId"
            floating
          >
            <Select v-model="statusFilter">
              <SelectTrigger
                :id="mobileStatusFilterId"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                <SelectItem value="ACTIVE">Berlangsung</SelectItem>
                <SelectItem value="WAITING">Menunggu</SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
        </DialogBody>
        <DialogFooter standard>
          <Button
            variant="outline"
            :disabled="statusFilter === 'ALL'"
            @click="statusFilter = 'ALL'"
          >
            Atur Ulang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
