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
      <dl class="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
        <div class="flex flex-col gap-0.5">
          <dt class="text-control text-muted-foreground">Kapasitas</dt>
          <dd class="font-medium">{{ room?.capacity ?? '-' }} kursi</dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="text-control text-muted-foreground">Peserta</dt>
          <dd class="font-medium">{{ registered ?? '-' }} siswa</dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="text-control text-muted-foreground">Mapel</dt>
          <dd class="font-medium">{{ subject ?? '-' }}</dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="text-control text-muted-foreground">Pengawas</dt>
          <dd class="font-medium">
            {{ room?.currentSupervisorName ?? 'Belum ditugaskan' }}
            <Badge
              v-if="room?.isSubstituted"
              variant="warning"
              >Pengganti</Badge
            >
          </dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="text-control text-muted-foreground">Teknisi</dt>
          <dd class="font-medium">{{ room?.technicianName ?? '-' }}</dd>
        </div>
      </dl>
    </CardContent>
  </Card>
</template>
