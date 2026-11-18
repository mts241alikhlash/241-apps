<script setup lang="ts">
import { formatPrintDate, formatPrintRange } from '../format'
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
        <p>Daftar Hadir Pengawas dan Teknisi · {{ event.name }}</p>
        <p>Ruang {{ room.code }} · {{ room.name }}</p>
      </div>
      <table class="w-full border-collapse text-left">
        <thead>
          <tr>
            <th class="border p-1">Peran</th>
            <th class="border p-1">Hari, tanggal</th>
            <th class="border p-1">Waktu</th>
            <th class="border p-1">Nama</th>
            <th class="border p-1">Tanda tangan</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="slot in room.supervisors"
            :key="slot.startsAt"
          >
            <td class="border p-1">Pengawas</td>
            <td class="border p-1">{{ formatPrintDate(slot.startsAt) }}</td>
            <td class="border p-1">
              {{ formatPrintRange(slot.startsAt, slot.endsAt) }}
            </td>
            <td class="border p-1">{{ slot.name ?? '-' }}</td>
            <td class="border p-1"></td>
          </tr>
          <tr v-if="room.technician">
            <td class="border p-1">Teknisi</td>
            <td
              class="border p-1"
              colspan="2"
            >
              Seluruh sesi
            </td>
            <td class="border p-1">{{ room.technician.name ?? '-' }}</td>
            <td class="border p-1"></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
