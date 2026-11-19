<script setup lang="ts">
import { computed } from 'vue'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import ExamCard from './ExamCard.vue'
import ExamSeatCard from './ExamSeatCard.vue'
import type { RoomMonitorParticipant } from '../types'

const props = defineProps<{
  kind: 'cards' | 'labels'
  rows: readonly RoomMonitorParticipant[]
  roomLabel: string
  roomCode: string
  shortWarning?: string | null
}>()

const sorted = computed(() =>
  [...props.rows].sort((a, b) => a.seatNumber - b.seatNumber),
)
</script>

<template>
  <div class="space-y-3">
    <Alert
      v-if="shortWarning"
      variant="destructive"
    >
      <AlertDescription>{{ shortWarning }}</AlertDescription>
    </Alert>

    <div
      v-if="kind === 'cards'"
      class="print-sheet card-sheet grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <ExamCard
        v-for="row in sorted"
        :key="row.studentId"
        :name="row.studentName ?? 'Siswa tidak ditemukan'"
        :class-name="row.classroomName"
        :nis="row.nis"
        :participant-number="row.participantNumber"
        :room-code="roomCode"
      />
    </div>

    <div
      v-else
      class="print-sheet card-sheet grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <ExamSeatCard
        v-for="row in sorted"
        :key="`seat-${row.studentId}`"
        :seat-number="row.seatNumber"
        :participant-number="row.participantNumber"
        :name="row.studentName ?? 'Siswa tidak ditemukan'"
        :class-name="row.classroomName"
        :room-code="roomCode"
      />
    </div>
  </div>
</template>
