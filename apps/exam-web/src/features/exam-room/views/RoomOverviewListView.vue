<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
import { examRoomService } from '../services/examRoomService'
import type { RoomOverview } from '../types'
import { buildRoomOverviewColumns } from '../components/roomOverviewColumns'

const router = useRouter()
const rooms = ref<RoomOverview[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Ruang Ujian', href: '/exam/rooms' },
])

const columns = computed(() =>
  buildRoomOverviewColumns({
    onOpen: (room) => void router.push(`/exam/rooms/${room.id}`),
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
      <CardHeader variant="muted">
        <CardTitle class="font-semibold">Ruang Ujian</CardTitle>
      </CardHeader>
      <CardContent class="flex min-h-0 flex-1 flex-col overflow-auto p-2">
        <div
          v-if="error"
          class="m-4 space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-[length:var(--text-control,0.75rem)]">{{ error }}</p>
          <Button
            variant="outline"
            @click="load"
          >
            Coba lagi
          </Button>
        </div>
        <DataTable
          v-else
          mobile="cards"
          row-clickable
          hide-pagination
          :page-size="rooms.length"
          :columns="columns"
          :data="rooms"
          :is-loading="loading"
          item-label="ruangan"
          @row-click="
            (room: RoomOverview) => router.push(`/exam/rooms/${room.id}`)
          "
        >
          <template #empty>
            <p class="p-6 text-center text-muted-foreground">
              Belum ada ruangan aktif untuk Anda.
            </p>
          </template>
        </DataTable>
      </CardContent>
      <CardFooter variant="thin" />
    </Card>
  </div>
</template>
