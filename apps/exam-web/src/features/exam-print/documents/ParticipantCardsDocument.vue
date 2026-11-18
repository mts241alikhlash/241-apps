<script setup lang="ts">
import type { PrintPack, PrintPackRoom } from '../types'

defineProps<{
  event: PrintPack['event']
  rooms: PrintPackRoom[]
  schoolName: string
}>()
</script>

<template>
  <section
    v-for="room in rooms"
    :key="room.id"
    class="print-room space-y-3"
  >
    <div class="print-sheet grid gap-3 sm:grid-cols-2">
      <article
        v-for="student in room.students"
        :key="student.studentId"
        class="space-y-1 rounded-md border p-4"
      >
        <p class="uppercase">{{ schoolName }}</p>
        <p class="font-semibold">Kartu Peserta {{ event.name }}</p>
        <p class="font-medium">{{ student.name ?? '-' }}</p>
        <p>NIS {{ student.nis ?? '-' }} · {{ student.classroomName ?? '-' }}</p>
        <p>Nomor peserta {{ student.participantNumber ?? '-' }}</p>
        <p>Ruang {{ room.code }} · Kursi {{ student.seatNumber }}</p>
      </article>
    </div>
  </section>
</template>
