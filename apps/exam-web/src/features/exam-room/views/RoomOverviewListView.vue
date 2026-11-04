<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Card, CardHeader, CardTitle } from '@mts241alikhlash/ui/card'
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
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardHeader standard>
        <CardTitle size="lg">Ruang Ujian</CardTitle>
      </CardHeader>
      <div class="space-y-4 p-0 sm:px-0">
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
          :columns="columns"
          :data="rooms"
          :is-loading="loading"
          item-label="ruangan"
          @row-click="
            (room: RoomOverview) => router.push(`/exam/rooms/${room.id}`)
          "
        >
          <template #empty>
            <p>Belum ada ruangan aktif untuk Anda.</p>
          </template>
        </DataTable>
      </div>
    </Card>
  </div>
</template>
