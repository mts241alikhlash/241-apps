<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BackButton } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Printer } from '@lucide/vue'
import { examRoomService } from '../services/examRoomService'
import type {
  Letterhead,
  RoomMonitorMeta,
  RoomMonitorParticipant,
} from '../types'

const props = defineProps<{ kind: 'cards' | 'labels' }>()

const route = useRoute()
const router = useRouter()

const roomId = computed(() => String(route.params.roomId ?? ''))
const slotId = computed(() =>
  typeof route.query.slot === 'string' ? route.query.slot : '',
)

const roster = ref<RoomMonitorParticipant[]>([])
const rosterTotal = ref(0)
const meta = ref<RoomMonitorMeta | null>(null)
const letterhead = ref<Letterhead | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const schoolName = computed(() => letterhead.value?.name ?? '')
const rosterShort = computed(() => rosterTotal.value > roster.value.length)
const roomLabel = computed(() =>
  meta.value === null
    ? 'Ruangan'
    : `${meta.value.room.code} · ${meta.value.room.name}`,
)
const sorted = computed(() =>
  [...roster.value].sort((a, b) => a.seatNumber - b.seatNumber),
)
const title = computed(() =>
  props.kind === 'cards' ? 'Cetak Kartu Peserta' : 'Cetak Daftar Meja',
)

function print() {
  document.body.classList.add('printing-sheet')
  window.print()
  document.body.classList.remove('printing-sheet')
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const [rosterResult, letterheadResult] = await Promise.all([
      examRoomService.loadRoster(roomId.value, slotId.value),
      examRoomService.loadLetterhead(),
    ])
    roster.value = rosterResult.data
    rosterTotal.value = rosterResult.total
    meta.value = rosterResult.meta
    letterhead.value = letterheadResult
  } catch {
    roster.value = []
    error.value = 'Dokumen tidak dapat dimuat. Periksa koneksi lalu coba lagi.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card gap="none">
      <CardHeader standard>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <BackButton
              label="Kembali ke Ruang Ujian"
              @click="router.push(`/exam/rooms/${roomId}`)"
            />
            <CardTitle size="lg">{{ title }}</CardTitle>
          </div>
          <Button
            :disabled="loading || roster.length === 0"
            @click="print"
          >
            <Printer class="mr-1.5 size-4" />
            Cetak A4
          </Button>
        </div>
      </CardHeader>

      <CardContent variant="standard">
        <div
          v-if="error"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive"
          role="alert"
        >
          <p>{{ error }}</p>
          <Button
            class="mt-2"
            variant="outline"
            :disabled="loading"
            @click="load"
          >
            Coba lagi
          </Button>
        </div>

        <p
          v-else-if="loading"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Menyiapkan dokumen...
        </p>

        <p
          v-else-if="roster.length === 0"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Ruangan ini belum memiliki kursi peserta.
        </p>

        <div
          v-else-if="kind === 'cards'"
          class="print-sheet grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <p
            v-if="rosterShort"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive"
            role="alert"
          >
            Memuat {{ roster.length }} dari {{ rosterTotal }} peserta.
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
            v-if="rosterShort"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive"
            role="alert"
          >
            Memuat {{ roster.length }} dari {{ rosterTotal }} peserta.
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
      </CardContent>
    </Card>
  </div>
</template>
