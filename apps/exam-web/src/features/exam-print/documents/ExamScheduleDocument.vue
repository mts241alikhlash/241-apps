<script setup lang="ts">
import { computed } from 'vue'
import LetterheadKop from '@/features/exam-room/components/LetterheadKop.vue'
import { CARD_HEADER } from '@/features/exam-room/components/cardHeader'
import { formatPrintDate, formatPrintRange } from '../format'
import type { PrintPack, PrintSchedule } from '../types'

const props = defineProps<{
  event: PrintPack['event']
  schedules: PrintSchedule[]
}>()

const sorted = computed(() =>
  [...props.schedules].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
)
</script>

<template>
  <section class="print-room">
    <div class="print-sheet space-y-1">
      <LetterheadKop />
      <div class="space-y-4">
        <div class="text-center">
          <p class="text-base font-semibold uppercase">Jadwal Ujian</p>
          <p class="uppercase">{{ CARD_HEADER.title }}</p>
          <p class="uppercase">{{ CARD_HEADER.period }}</p>
        </div>
        <table class="w-full border-collapse text-left">
          <thead>
            <tr>
              <th class="border p-1">Hari, tanggal</th>
              <th class="border p-1">Waktu</th>
              <th class="border p-1">Kelas</th>
              <th class="border p-1">Mata pelajaran</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="schedule in sorted"
              :key="schedule.id"
            >
              <td class="border p-1">
                {{ formatPrintDate(schedule.startsAt) }}
              </td>
              <td class="border p-1">
                {{ formatPrintRange(schedule.startsAt, schedule.endsAt) }}
              </td>
              <td class="border p-1">{{ schedule.classroomName ?? '-' }}</td>
              <td class="border p-1">{{ schedule.packageTitle }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
