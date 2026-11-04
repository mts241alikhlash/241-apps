<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { examRoomService } from '../services/examRoomService'
import type { ProctorSnapshotEvidence } from '../types'

const props = defineProps<{
  open: boolean
  sessionId: string | null
  studentName: string | null
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const evidence = ref<ProctorSnapshotEvidence[]>([])
const images = ref<Record<string, string>>({})
const loading = ref(false)
const error = ref<string | null>(null)

const dateTime = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'medium',
})

const KIND_LABEL: Record<ProctorSnapshotEvidence['kind'], string> = {
  SESSION_START: 'Mulai ujian',
  VIOLATION_RETURN: 'Kembali dari pelanggaran',
  PERIODIC_EVIDENCE: 'Sampel berkala',
}

const title = computed(() => props.studentName ?? 'Siswa')

const latestUrl = ref<string | null>(null)
const zoomed = ref<{ url: string; label: string } | null>(null)

function zoom(row: ProctorSnapshotEvidence) {
  const url = images.value[row.id]
  if (url) zoomed.value = { url, label: KIND_LABEL[row.kind] }
}

function downloadUrl(url: string, name: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${name}.jpg`
  anchor.click()
}

function download(row: ProctorSnapshotEvidence) {
  const url = images.value[row.id]
  if (!url) return
  downloadUrl(url, `${row.kind}-${row.capturedAt}`)
}

function revokeAll() {
  for (const url of Object.values(images.value)) URL.revokeObjectURL(url)
  images.value = {}
  if (latestUrl.value) URL.revokeObjectURL(latestUrl.value)
  latestUrl.value = null
}

let ticket = 0

async function load(sessionId: string) {
  const current = ++ticket
  loading.value = true
  error.value = null
  evidence.value = []
  revokeAll()
  const result = await examRoomService.loadEvidence(sessionId)
  if (current !== ticket) return
  if (!result.success) {
    loading.value = false
    error.value = result.error
    return
  }
  evidence.value = result.data
  const latest = await examRoomService.loadLatestSnapshot(sessionId)
  if (current !== ticket) return
  if (latest !== null) latestUrl.value = URL.createObjectURL(latest)
  const blobs = await Promise.all(
    result.data.map((row) =>
      examRoomService.loadSnapshotImage(sessionId, row.id),
    ),
  )
  if (current !== ticket) return
  loading.value = false
  const next: Record<string, string> = {}
  result.data.forEach((row, index) => {
    const blob = blobs[index]
    if (blob === null) return
    next[row.id] = URL.createObjectURL(blob)
  })
  images.value = next
}

watch(
  () => [props.open, props.sessionId] as const,
  ([open, sessionId]) => {
    if (!open) {
      ticket += 1
      loading.value = false
      error.value = null
      revokeAll()
      evidence.value = []
      return
    }
    if (sessionId === null || sessionId === '') return
    void load(sessionId)
  },
  { immediate: true },
)

onBeforeUnmount(revokeAll)
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>Galeri Bukti Foto</DialogTitle>
        <DialogDescription>{{ title }}</DialogDescription>
      </DialogHeader>
      <DialogBody class="min-h-0 flex-1 overflow-y-auto">
        <figure
          v-if="latestUrl"
          class="mb-3 overflow-hidden rounded-md border"
          data-testid="latest-snapshot"
        >
          <div class="aspect-video bg-muted">
            <img
              :src="latestUrl"
              alt="Foto terkini"
              class="h-full w-full cursor-zoom-in object-cover"
              @click="zoomed = { url: latestUrl, label: 'Terkini' }"
            />
          </div>
          <figcaption
            class="flex items-center justify-between gap-2 p-2 text-[length:var(--text-control,0.75rem)]"
          >
            <p class="font-medium">Terkini</p>
            <Button
              variant="outline"
              size="sm"
              data-testid="latest-download"
              @click="downloadUrl(latestUrl, 'terkini')"
            >
              Unduh
            </Button>
          </figcaption>
        </figure>
        <p
          v-if="error"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive"
          role="alert"
        >
          {{ error }}
        </p>
        <p
          v-else-if="!loading && evidence.length === 0"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Belum ada foto bukti pada sesi ini.
        </p>
        <div
          v-else
          class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <figure
            v-for="row in evidence"
            :key="row.id"
            class="overflow-hidden rounded-md border"
          >
            <div class="aspect-video bg-muted">
              <img
                v-if="images[row.id]"
                :src="images[row.id]"
                :alt="`Foto bukti ${KIND_LABEL[row.kind]}`"
                class="h-full w-full cursor-zoom-in object-cover"
                data-testid="evidence-image"
                @click="zoom(row)"
              />
            </div>
            <figcaption
              class="space-y-1 p-2 text-[length:var(--text-control,0.75rem)]"
            >
              <p class="font-medium">{{ KIND_LABEL[row.kind] }}</p>
              <p class="tabular-nums text-muted-foreground">
                {{ dateTime.format(new Date(row.capturedAt)) }}
              </p>
              <Button
                variant="outline"
                size="sm"
                :disabled="!images[row.id]"
                data-testid="evidence-download"
                @click="download(row)"
              >
                Unduh
              </Button>
            </figcaption>
          </figure>
        </div>
      </DialogBody>
      <DialogFooter standard>
        <Button
          variant="outline"
          @click="emit('update:open', false)"
        >
          Tutup
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  <Dialog
    :open="zoomed !== null"
    @update:open="zoomed = null"
  >
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>{{ zoomed?.label ?? 'Foto bukti' }}</DialogTitle>
      </DialogHeader>
      <DialogBody class="min-h-0 flex-1 overflow-auto">
        <img
          v-if="zoomed"
          :src="zoomed.url"
          alt="Foto bukti ukuran penuh"
          class="w-full"
          data-testid="evidence-zoom"
        />
      </DialogBody>
    </DialogContent>
  </Dialog>
</template>
