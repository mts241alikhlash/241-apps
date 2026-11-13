<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import type { AcceptableValue } from '@mts241alikhlash/ui/select'
import { ServiceRequestError } from '@mts241alikhlash/web-shared/utils/service-client'
import { Printer } from '@lucide/vue'
import RosterSheet from '../components/RosterSheet.vue'
import { examEventService } from '../../exam-event/services/examEventService'
import { examRoomService } from '../services/examRoomService'
import type { Letterhead, RoomMonitorParticipant } from '../types'

interface RoomSheet {
  roomId: string
  label: string
  rows: RoomMonitorParticipant[]
  loaded: number
  total: number
}

const props = defineProps<{ kind: 'cards' | 'labels' }>()

const eventFieldId = useId()

const events = ref<{ id: string; name: string }[]>([])
const eventId = ref('')
const sheets = ref<RoomSheet[]>([])
const letterhead = ref<Letterhead | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const skippedRooms = ref(0)

const title = computed(() =>
  props.kind === 'cards' ? 'Kartu Peserta' : 'Daftar Meja',
)
const schoolName = computed(() => letterhead.value?.name ?? '')
const participantCount = computed(() =>
  sheets.value.reduce((sum, sheet) => sum + sheet.rows.length, 0),
)
const hasRows = computed(() => participantCount.value > 0)
const printableSheets = computed(() =>
  sheets.value.filter((sheet) => sheet.rows.length > 0),
)

function print() {
  document.body.classList.add('printing-stack')
  window.print()
  document.body.classList.remove('printing-stack')
}

async function loadAll(target: string) {
  if (target === '') {
    sheets.value = []
    skippedRooms.value = 0
    return
  }
  loading.value = true
  error.value = null
  try {
    const rooms = await examEventService.loadRooms(target)
    if (!rooms.success) {
      error.value = rooms.error
      sheets.value = []
      return
    }
    const collected: RoomSheet[] = []
    let skipped = 0
    for (const room of rooms.data) {
      try {
        const roster = await examRoomService.loadRoster(room.id, '')
        collected.push({
          roomId: room.id,
          label: `${room.code} · ${room.name}`,
          rows: roster.data,
          loaded: roster.data.length,
          total: roster.total,
        })
      } catch (err: unknown) {
        if (!(err instanceof ServiceRequestError)) throw err
        if (err.response.status !== 403) throw err
        skipped += 1
      }
    }
    sheets.value = collected
    skippedRooms.value = skipped
  } catch {
    error.value = 'Dokumen tidak dapat dimuat. Periksa koneksi lalu coba lagi.'
    sheets.value = []
  } finally {
    loading.value = false
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const result = await examEventService.loadEvents({ limit: 200 })
    if (!result.success) {
      error.value = result.error
      return
    }
    events.value = result.data.map((event) => ({
      id: event.id,
      name: event.name,
    }))
    const active = result.data.find((event) => event.status === 'ACTIVE')
    eventId.value = active?.id ?? result.data[0]?.id ?? ''
  } catch {
    error.value = 'Dokumen tidak dapat dimuat. Periksa koneksi lalu coba lagi.'
  } finally {
    loading.value = false
  }
  await loadAll(eventId.value)
}

async function loadLetterhead() {
  try {
    letterhead.value = await examRoomService.loadLetterhead()
  } catch {
    letterhead.value = null
  }
}

async function changeEvent(value: AcceptableValue) {
  eventId.value = typeof value === 'string' ? value : ''
  await loadAll(eventId.value)
}

onMounted(async () => {
  await Promise.all([load(), loadLetterhead()])
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader variant="muted">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <CardTitle class="font-semibold">{{ title }}</CardTitle>
          <div class="flex items-end gap-2">
            <FloatingLabelField
              label="Periode Ujian"
              :for="eventFieldId"
              class="w-fit min-w-40"
              floating
            >
              <Select
                :model-value="eventId"
                @update:model-value="changeEvent"
              >
                <SelectTrigger
                  :id="eventFieldId"
                  class="w-full"
                >
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="event in events"
                    :key="event.id"
                    :value="event.id"
                  >
                    {{ event.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>
            <Button
              :disabled="loading || !hasRows"
              @click="print"
            >
              <Printer class="mr-1.5 size-4" />
              Cetak A4
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent
        class="print-stack flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6 space-y-6"
      >
        <div
          v-if="error"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive print:hidden"
          role="alert"
        >
          <p>{{ error }}</p>
          <Button
            class="mt-2"
            variant="outline"
            :disabled="loading"
            @click="loadAll(eventId)"
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
          v-else-if="events.length === 0"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Belum ada periode ujian.
        </p>

        <p
          v-else-if="!hasRows"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          {{
            skippedRooms > 0
              ? 'Tidak ada ruangan pada periode ini yang bisa Anda akses.'
              : 'Periode ini belum memiliki kursi peserta di ruangan mana pun.'
          }}
        </p>

        <template v-else>
          <p
            v-if="skippedRooms > 0"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive print:hidden"
            role="alert"
          >
            {{ skippedRooms }} ruangan dilewati karena Anda tidak bertugas di
            sana.
          </p>
          <section
            v-for="sheet in printableSheets"
            :key="sheet.roomId"
            class="print-room space-y-3"
          >
            <h2 class="text-base font-semibold">
              {{ sheet.label }}
              <span
                class="ml-1 text-[length:var(--text-control,0.75rem)] font-normal text-muted-foreground tabular-nums"
                >{{ sheet.rows.length }} peserta</span
              >
            </h2>
            <RosterSheet
              :kind="kind"
              :rows="sheet.rows"
              :room-label="sheet.label"
              :school-name="schoolName"
              :short-warning="
                sheet.total > sheet.loaded
                  ? `Memuat ${sheet.loaded} dari ${sheet.total} peserta.`
                  : null
              "
            />
          </section>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
