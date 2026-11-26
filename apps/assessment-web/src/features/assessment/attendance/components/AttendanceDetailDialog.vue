<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import type { Attendance, AttendanceStatus } from '../types'

const props = defineProps<{
  open: boolean
  date: Date | string | null
  attendances: Attendance[]
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: 'Hadir',
  LATE: 'Terlambat',
  SICK: 'Sakit',
  EXCUSED: 'Izin',
  ABSENT: 'Alpa',
}

const dayName = computed(() => {
  if (!props.date) return '-'
  const d = new Date(props.date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', { weekday: 'long' })
})

const formattedDate = computed(() => {
  if (!props.date) return '-'
  const d = new Date(props.date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="(val) => emit('update:open', val)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Detail Kehadiran</DialogTitle>
        <DialogDescription>
          Rincian kehadiran siswa pada tanggal {{ formattedDate }}.
        </DialogDescription>
      </DialogHeader>

      <DialogBody class="space-y-4">
        <dl
          class="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-4 py-2"
        >
          <div class="flex flex-col gap-0.5">
            <dt class="text-control text-muted-foreground">Hari</dt>
            <dd class="font-medium">{{ dayName }}</dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="text-control text-muted-foreground">Tanggal</dt>
            <dd class="font-medium">{{ formattedDate }}</dd>
          </div>
        </dl>

        <div class="space-y-2 text-control">
          <div class="space-y-1">
            <p class="text-muted-foreground font-medium">Kehadiran</p>
            <div v-if="attendances.length === 1">
              <span class="font-medium">
                {{
                  STATUS_LABEL[attendances[0].status] ?? attendances[0].status
                }}
              </span>
              <span
                v-if="attendances[0].schedule?.timeSlot?.name"
                class="text-muted-foreground ml-1.5"
              >
                ({{ attendances[0].schedule.timeSlot.name }})
              </span>
            </div>
            <div
              v-else-if="attendances.length > 1"
              class="space-y-1"
            >
              <div
                v-for="(att, idx) in attendances"
                :key="att.id ?? idx"
                class="flex items-center gap-1.5"
              >
                <span class="font-medium">
                  {{ STATUS_LABEL[att.status] ?? att.status }}
                </span>
                <span
                  v-if="att.schedule?.timeSlot?.name"
                  class="text-muted-foreground"
                >
                  ({{ att.schedule.timeSlot.name }})
                </span>
              </div>
            </div>
            <p
              v-else
              class="text-muted-foreground"
            >
              -
            </p>
          </div>

          <div class="space-y-1">
            <p class="text-muted-foreground font-medium">Catatan</p>
            <p
              v-if="attendances.length === 1"
              class="break-words"
            >
              {{ attendances[0].note || '-' }}
            </p>
            <div
              v-else-if="attendances.length > 1"
              class="space-y-1"
            >
              <div
                v-for="(att, idx) in attendances"
                :key="att.id ?? idx"
              >
                <span
                  v-if="att.schedule?.timeSlot?.name"
                  class="text-muted-foreground font-medium"
                >
                  {{ att.schedule.timeSlot.name }}:
                </span>
                <span class="ml-1">
                  {{ att.note || '-' }}
                </span>
              </div>
            </div>
            <p
              v-else
              class="text-muted-foreground"
            >
              -
            </p>
          </div>
        </div>
      </DialogBody>

      <DialogFooter standard>
        <Button
          variant="outline"
          @click="emit('update:open', false)"
        >
          Tutup
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
