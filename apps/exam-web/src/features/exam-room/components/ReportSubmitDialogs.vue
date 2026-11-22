<script setup lang="ts">
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
import { REPORT_FILE_ACCEPT } from '../composables/reportFile'
import {
  keyOf,
  type ReportSubmission,
} from '../composables/useReportSubmission'
import type { RoomReportSummary } from '../types'

const props = defineProps<{ submission: ReportSubmission }>()

const {
  backToSubjects,
  chooseSubject,
  choices,
  confirm,
  confirmOpen,
  done,
  failures,
  files,
  problems,
  queue,
  ready,
  resultOpen,
  retryFailed,
  running,
  runTotal,
  setFile,
  step,
  succeeded,
} = props.submission

function pick(row: RoomReportSummary, event: Event) {
  setFile(row, (event.target as HTMLInputElement).files?.[0] ?? null)
}
</script>

<template>
  <Dialog
    :open="confirmOpen"
    @update:open="(open) => !running && (confirmOpen = open)"
  >
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>Serahkan Berita Acara</DialogTitle>
        <DialogDescription>
          Unggah berita acara yang sudah ditandatangani dan dipindai (PDF, JPG,
          atau PNG, maks. 10 MB). Berita acara yang diserahkan tidak dapat
          diubah lagi.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-3">
        <template v-if="step === 'subject'">
          <p class="text-control">Pilih mata pelajaran yang diserahkan.</p>
          <ul class="space-y-2">
            <li
              v-for="choice in choices"
              :key="choice.id"
            >
              <Button
                variant="outline"
                class="w-full justify-between"
                @click="chooseSubject(choice.id)"
              >
                <span class="truncate">{{ choice.name }}</span>
                <span class="text-muted-foreground">
                  {{ choice.draftCount }} ruangan belum diserahkan
                </span>
              </Button>
            </li>
          </ul>
        </template>
        <template v-else>
          <ul class="space-y-3">
            <li
              v-for="row in queue"
              :key="keyOf(row)"
              class="space-y-1"
            >
              <p class="text-control font-medium">{{ row.roomName }}</p>
              <FileDropzone
                :accept="REPORT_FILE_ACCEPT"
                :file-name="files[keyOf(row)]?.name"
                clearable
                :invalid="problems[keyOf(row)] !== undefined"
                :disabled="running"
                :aria-label="`Pilih berkas berita acara ${row.roomName}`"
                hint="PDF, JPG, atau PNG, maks. 10 MB"
                @change="pick(row, $event)"
                @clear="setFile(row, null)"
              />
              <p
                v-if="problems[keyOf(row)]"
                class="text-control text-destructive"
                role="alert"
              >
                {{ problems[keyOf(row)] }}
              </p>
            </li>
          </ul>
          <p
            v-if="running"
            class="text-control text-muted-foreground"
            role="status"
          >
            {{ done }} dari {{ runTotal }}
          </p>
        </template>
      </DialogBody>
      <DialogFooter standard>
        <Button
          variant="outline"
          :disabled="running"
          @click="
            step === 'files' && choices.length > 0
              ? backToSubjects()
              : (confirmOpen = false)
          "
        >
          {{ step === 'files' && choices.length > 0 ? 'Kembali' : 'Batal' }}
        </Button>
        <Button
          :disabled="!ready || running"
          @click="confirm"
        >
          {{ running ? 'Menyerahkan...' : 'Serahkan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog v-model:open="resultOpen">
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Hasil Penyerahan</DialogTitle>
        <DialogDescription>
          Ringkasan penyerahan berita acara.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-2">
        <p class="text-control">
          {{ succeeded }} dari
          {{ succeeded + failures.length }}
          berita acara diserahkan.
        </p>
        <ul
          v-if="failures.length > 0"
          class="space-y-1 text-control text-destructive"
          role="alert"
        >
          <li
            v-for="item in failures"
            :key="item.key"
          >
            {{ item.roomName }} - {{ item.subjectName }}: {{ item.error }}
          </li>
        </ul>
      </DialogBody>
      <DialogFooter standard>
        <Button
          v-if="failures.length > 0"
          @click="retryFailed"
        >
          Coba lagi yang gagal
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
