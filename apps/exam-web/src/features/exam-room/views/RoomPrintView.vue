<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BackButton } from '@mts241alikhlash/ui'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@mts241alikhlash/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@mts241alikhlash/ui/empty'
import { Spinner } from '@mts241alikhlash/ui/spinner'
import { Armchair, Printer } from '@lucide/vue'
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
const roomCode = computed(() => meta.value?.room.code ?? '')
const eventTitle = computed(() => roster.value[0]?.packageTitle ?? '')
const eventPeriod = computed(() => '')
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
      <CardHeader standard>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <BackButton
              label="Kembali ke Ruang Ujian"
              @click="router.push(`/exam/rooms/${roomId}`)"
            />
            <CardTitle class="font-semibold">{{ title }}</CardTitle>
          </div>
          <div class="flex items-end gap-2">
            <Button
              :disabled="loading || roster.length === 0"
              @click="print"
            >
              <Printer class="size-4" />
              Cetak A4
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto p-4 space-y-4"
      >
        <Alert
          v-if="error"
          variant="destructive"
        >
          <AlertDescription class="space-y-2">
            <p>{{ error }}</p>
            <Button
              variant="outline"
              :disabled="loading"
              @click="load"
            >
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>

        <p
          v-else-if="loading"
          class="flex items-center gap-2 text-control text-muted-foreground"
          role="status"
        >
          <Spinner />
          Menyiapkan dokumen…
        </p>

        <Empty
          v-else-if="roster.length === 0"
          class="border"
        >
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Armchair />
            </EmptyMedia>
            <EmptyTitle>Belum ada kursi peserta</EmptyTitle>
            <EmptyDescription>
              Atur kursi peserta di ruangan ini, lalu cetak kartunya.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>

        <RosterSheet
          v-else
          :kind="kind"
          :rows="roster"
          :room-label="roomLabel"
          :room-code="roomCode"
          :school-name="schoolName"
          :event-title="eventTitle"
          :event-period="eventPeriod"
          :short-warning="
            rosterShort
              ? `Memuat ${roster.length} dari ${rosterTotal} peserta.`
              : null
          "
        />
      </CardContent>
      <CardFooter plain />
    </Card>
  </div>
</template>
