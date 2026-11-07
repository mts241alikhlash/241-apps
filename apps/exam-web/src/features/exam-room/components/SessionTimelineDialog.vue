<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
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
import type { SessionTimelineEntry } from '../types'
import { eventLabel } from '../types'

const props = defineProps<{
  open: boolean
  studentName: string | null
  sessionId: string | null
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const entries = ref<SessionTimelineEntry[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const showAll = ref(false)

const violations = computed(() =>
  entries.value.filter((entry) => entry.isViolation),
)
const visibleEntries = computed(() =>
  showAll.value ? entries.value : violations.value,
)
const hiddenCount = computed(
  () => entries.value.length - violations.value.length,
)

const dateTime = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'medium',
})

const title = computed(() => props.studentName ?? 'Siswa')

function labelOf(entry: SessionTimelineEntry): string {
  return entry.kind === 'EVENT'
    ? eventLabel(entry.type)
    : eventLabel(entry.action)
}

async function load(sessionId: string) {
  loading.value = true
  error.value = null
  const result = await examRoomService.loadTimeline(sessionId)
  loading.value = false
  if (result.success) {
    entries.value = result.data
  } else {
    entries.value = []
    error.value = result.error
  }
}

watch(
  () => [props.open, props.sessionId] as const,
  ([open, sessionId]) => {
    if (!open) return
    entries.value = []
    if (sessionId === null || sessionId === '') return
    void load(sessionId)
  },
  { immediate: true },
)
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>Riwayat Kejadian</DialogTitle>
        <DialogDescription>{{ title }}</DialogDescription>
      </DialogHeader>
      <DialogBody class="min-h-0 flex-1 overflow-y-auto">
        <p
          v-if="error"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive"
          role="alert"
        >
          {{ error }}
        </p>
        <p
          v-else-if="!loading && visibleEntries.length === 0"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          {{
            hiddenCount > 0
              ? 'Tidak ada pelanggaran yang dihitung pada sesi ini.'
              : 'Belum ada kejadian pada sesi ini.'
          }}
        </p>
        <ol
          v-else
          class="divide-y rounded-md border"
        >
          <li
            v-for="entry in visibleEntries"
            :key="entry.id"
            class="flex flex-wrap items-center gap-2 p-3 text-[length:var(--text-control,0.75rem)]"
          >
            <Badge :variant="entry.isViolation ? 'destructive' : 'outline'">
              {{ labelOf(entry) }}
            </Badge>
            <span class="tabular-nums text-muted-foreground">
              {{ dateTime.format(new Date(entry.occurredAt)) }}
            </span>
            <span v-if="entry.detail">{{ entry.detail }}</span>
            <span
              v-if="entry.reason"
              class="text-muted-foreground"
            >
              {{ entry.reason }}
            </span>
          </li>
        </ol>
      </DialogBody>
      <DialogFooter
        standard
        class="flex items-center justify-between gap-2"
      >
        <p
          v-if="!showAll && hiddenCount > 0"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          {{ hiddenCount }} kejadian lain disembunyikan
        </p>
        <span v-else />
        <div class="flex items-center gap-2">
          <Button
            v-if="entries.length > 0"
            variant="outline"
            @click="showAll = !showAll"
          >
            {{ showAll ? 'Hanya pelanggaran' : 'Tampilkan semua' }}
          </Button>
          <Button
            variant="outline"
            @click="emit('update:open', false)"
          >
            Tutup
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
