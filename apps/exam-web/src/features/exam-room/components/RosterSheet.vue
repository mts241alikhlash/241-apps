<script setup lang="ts">
import { computed } from 'vue'
import type { RoomMonitorParticipant } from '../types'

const props = defineProps<{
  kind: 'cards' | 'labels'
  rows: readonly RoomMonitorParticipant[]
  roomLabel: string
  schoolName: string
  shortWarning?: string | null
}>()

const sorted = computed(() =>
  [...props.rows].sort((a, b) => a.seatNumber - b.seatNumber),
)
</script>

<template>
  <div
    v-if="kind === 'cards'"
    class="print-sheet grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
  >
    <p
      v-if="shortWarning"
      class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive"
      role="alert"
    >
      {{ shortWarning }}
    </p>
    <article
      v-for="row in sorted"
      :key="row.studentId"
      class="space-y-1 rounded-md border p-4"
    >
      <p
        v-if="schoolName"
        class="text-[length:var(--text-control,0.75rem)] uppercase"
      >
        {{ schoolName }}
      </p>
      <p class="font-medium">
        {{ row.studentName ?? 'Siswa tidak ditemukan' }}
      </p>
      <p class="tabular-nums text-[length:var(--text-control,0.75rem)]">
        NIS {{ row.nis ?? '-' }} · {{ row.classroomName ?? '-' }}
      </p>
      <div class="flex items-baseline justify-between pt-2">
        <span class="text-[length:var(--text-control,0.75rem)]">
          {{ roomLabel }}
        </span>
        <span class="text-xl font-semibold tabular-nums">
          {{ row.seatNumber }}
        </span>
      </div>
    </article>
  </div>

  <div
    v-else
    class="print-sheet space-y-3"
  >
    <p
      v-if="shortWarning"
      class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive"
      role="alert"
    >
      {{ shortWarning }}
    </p>
    <div class="text-center">
      <p
        v-if="schoolName"
        class="text-base font-semibold uppercase"
      >
        {{ schoolName }}
      </p>
      <p class="text-[length:var(--text-control,0.75rem)]">
        Daftar Meja {{ roomLabel }}
      </p>
    </div>
    <table
      class="w-full border-collapse text-[length:var(--text-control,0.75rem)]"
    >
      <thead>
        <tr class="border-y border-black">
          <th class="py-1 text-center">Kursi</th>
          <th class="py-1 text-left">Nama</th>
          <th class="py-1 text-left">NIS</th>
          <th class="py-1 text-left">Kelas</th>
          <th class="py-1 text-left">Mata Pelajaran</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in sorted"
          :key="`label-${row.studentId}`"
          class="border-b border-black/30"
        >
          <td class="py-1 text-center tabular-nums">
            {{ row.seatNumber }}
          </td>
          <td class="py-1">{{ row.studentName ?? '-' }}</td>
          <td class="py-1 tabular-nums">{{ row.nis ?? '-' }}</td>
          <td class="py-1">{{ row.classroomName ?? '-' }}</td>
          <td class="py-1">{{ row.subjectName ?? row.packageTitle }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
