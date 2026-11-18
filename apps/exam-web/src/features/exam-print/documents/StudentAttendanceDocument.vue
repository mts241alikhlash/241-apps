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
    <div class="print-sheet space-y-3">
      <div class="text-center">
        <p class="font-semibold uppercase">{{ schoolName }}</p>
        <p>Daftar Hadir Peserta · {{ event.name }}</p>
        <p>Ruang {{ room.code }} · {{ room.name }}</p>
      </div>
      <table class="w-full border-collapse text-left">
        <thead>
          <tr>
            <th class="border p-1">Kursi</th>
            <th class="border p-1">No. Peserta</th>
            <th class="border p-1">Nama</th>
            <th class="border p-1">Kelas</th>
            <th class="border p-1">Tanda tangan</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="student in room.students"
            :key="student.studentId"
          >
            <td class="border p-1 tabular-nums">{{ student.seatNumber }}</td>
            <td class="border p-1">{{ student.participantNumber ?? '-' }}</td>
            <td class="border p-1">{{ student.name ?? '-' }}</td>
            <td class="border p-1">{{ student.classroomName ?? '-' }}</td>
            <td class="border p-1"></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
