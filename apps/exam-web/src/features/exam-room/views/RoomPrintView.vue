<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BackButton } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Printer } from '@lucide/vue'
import RosterSheet from '../components/RosterSheet.vue'
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
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader variant="muted">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <BackButton
              label="Kembali ke Ruang Ujian"
              @click="router.push(`/exam/rooms/${roomId}`)"
            />
            <CardTitle class="font-semibold">{{ title }}</CardTitle>
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

      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6 space-y-4"
      >
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

        <RosterSheet
          v-else
          :kind="kind"
          :rows="roster"
          :room-label="roomLabel"
          :school-name="schoolName"
          :short-warning="
            rosterShort
              ? `Memuat ${roster.length} dari ${rosterTotal} peserta.`
              : null
          "
        />
      </CardContent>
      <CardFooter variant="thin" />
    </Card>
  </div>
</template>
