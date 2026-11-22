<script setup lang="ts">
import { Badge } from '@mts241alikhlash/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import type { RoomMonitorRoom } from '../types'

defineProps<{
  room: RoomMonitorRoom | null
  subject: string | null
  registered: number | null
}>()
</script>

<template>
  <Card gap="none">
    <CardHeader standard>
      <CardTitle size="md">Ruang</CardTitle>
    </CardHeader>
    <CardContent variant="standard">
      <dl
        class="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1 sm:grid-cols-5 sm:gap-x-4 sm:gap-y-2"
      >
        <div class="contents sm:flex sm:flex-col sm:gap-0.5">
          <dt class="text-control text-muted-foreground">Kapasitas</dt>
          <dd class="min-w-0 break-words text-right font-medium sm:text-left">
            {{ room?.capacity ?? '-' }} kursi
          </dd>
        </div>
        <div class="contents sm:flex sm:flex-col sm:gap-0.5">
          <dt class="text-control text-muted-foreground">Peserta</dt>
          <dd class="min-w-0 break-words text-right font-medium sm:text-left">
            {{ registered ?? '-' }} siswa
          </dd>
        </div>
        <div class="contents sm:flex sm:flex-col sm:gap-0.5">
          <dt class="text-control text-muted-foreground">Mapel</dt>
          <dd class="min-w-0 break-words text-right font-medium sm:text-left">
            {{ subject ?? '-' }}
          </dd>
        </div>
        <div class="contents sm:flex sm:flex-col sm:gap-0.5">
          <dt class="text-control text-muted-foreground">Pengawas</dt>
          <dd class="min-w-0 break-words text-right font-medium sm:text-left">
            {{ room?.currentSupervisorName ?? 'Belum ditugaskan' }}
            <Badge
              v-if="room?.isSubstituted"
              variant="warning"
              >Pengganti</Badge
            >
          </dd>
        </div>
        <div class="contents sm:flex sm:flex-col sm:gap-0.5">
          <dt class="text-control text-muted-foreground">Teknisi</dt>
          <dd class="min-w-0 break-words text-right font-medium sm:text-left">
            {{ room?.technicianName ?? '-' }}
          </dd>
        </div>
      </dl>
    </CardContent>
  </Card>
</template>
