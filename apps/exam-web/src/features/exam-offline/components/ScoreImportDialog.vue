<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FileDropzone } from '@mts241alikhlash/ui'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@mts241alikhlash/ui/table'
import { examOfflineService } from '../services/examOfflineService'
import {
  IMPORT_ACCEPT,
  IMPORT_MAX_BYTES,
  SKIP_LABELS,
  type OfflineImportResult,
} from '../types'

const props = defineProps<{
  open: boolean
  scheduleId: string
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  imported: []
}>()

const file = ref<File | null>(null)
const problem = ref<string | null>(null)
const failure = ref<string | null>(null)
const uploading = ref(false)
const result = ref<OfflineImportResult | null>(null)

const ready = computed(
  () => file.value !== null && problem.value === null && !uploading.value,
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    file.value = null
    problem.value = null
    failure.value = null
    result.value = null
  },
  { immediate: true },
)

function problemOf(chosen: File): string | null {
  if (!/\.(xlsx|csv)$/i.test(chosen.name))
    return 'Pilih berkas .xlsx atau .csv.'
  if (chosen.size > IMPORT_MAX_BYTES) return 'Ukuran berkas maksimal 1 MB.'
  return null
}

function pick(event: Event) {
  const chosen = (event.target as HTMLInputElement).files?.[0] ?? null
  file.value = chosen
  failure.value = null
  problem.value = chosen === null ? null : problemOf(chosen)
}

function clear() {
  file.value = null
  problem.value = null
}

async function upload() {
  if (!ready.value || file.value === null) return
  uploading.value = true
  failure.value = null
  const outcome = await examOfflineService.importScores(
    props.scheduleId,
    file.value,
  )
  uploading.value = false
  if (!outcome.success) {
    failure.value = outcome.error
    return
  }
  result.value = outcome.data
  emit('imported')
}

function close(open: boolean) {
  if (!open && uploading.value) return
  emit('update:open', open)
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="close"
  >
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>Impor Nilai</DialogTitle>
        <DialogDescription>
          Unggah lembar nilai yang sudah diisi; baris dicocokkan dengan No.
          Peserta.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-3">
        <template v-if="result === null">
          <FileDropzone
            :accept="IMPORT_ACCEPT"
            :file-name="file?.name"
            clearable
            :invalid="problem !== null"
            :disabled="uploading"
            aria-label="Pilih berkas nilai"
            hint=".xlsx atau .csv, maks. 1 MB, 500 baris"
            @change="pick"
            @clear="clear"
          />
          <p
            v-if="problem"
            class="text-control text-destructive"
            role="alert"
          >
            {{ problem }}
          </p>
          <p
            v-if="failure"
            class="text-control text-destructive"
            role="alert"
          >
            {{ failure }}
          </p>
        </template>
        <template v-else>
          <p
            class="text-control font-medium"
            role="status"
          >
            {{ result.saved }} nilai tersimpan.
          </p>
          <div
            v-if="result.rejected.length > 0"
            data-test="rejected"
            class="space-y-1"
            role="alert"
          >
            <p class="text-control font-medium text-destructive">
              {{ result.rejected.length }} baris ditolak
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="text-center">Baris</TableHead>
                  <TableHead class="text-center">No. Peserta</TableHead>
                  <TableHead>Alasan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="item in result.rejected"
                  :key="`${item.row}-${item.reason}`"
                >
                  <TableCell class="text-center tabular-nums">
                    {{ item.row }}
                  </TableCell>
                  <TableCell class="text-center tabular-nums">
                    {{ item.participantNumber ?? '-' }}
                  </TableCell>
                  <TableCell class="whitespace-normal text-destructive">
                    {{ item.reason }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div
            v-if="result.skipped.length > 0"
            data-test="skipped"
            class="space-y-1"
          >
            <p class="text-control font-medium text-muted-foreground">
              {{ result.skipped.length }} baris dilewati
            </p>
            <ul class="space-y-0.5 text-control text-muted-foreground">
              <li
                v-for="item in result.skipped"
                :key="item.row"
              >
                Baris {{ item.row }}
                <template v-if="item.participantNumber">
                  ({{ item.participantNumber }})
                </template>
                : {{ SKIP_LABELS[item.reason] }}
              </li>
            </ul>
          </div>
        </template>
      </DialogBody>
      <DialogFooter
        standard
        :class="result === null ? 'justify-between' : undefined"
      >
        <template v-if="result === null">
          <Button
            variant="outline"
            :disabled="uploading"
            @click="close(false)"
          >
            Batal
          </Button>
          <Button
            :disabled="!ready"
            @click="upload"
          >
            {{ uploading ? 'Mengunggah...' : 'Unggah' }}
          </Button>
        </template>
        <Button
          v-else
          @click="close(false)"
        >
          Tutup
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
