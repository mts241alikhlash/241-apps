<script setup lang="ts">
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

const props = defineProps<{
  open: boolean
  missingNames: string[]
  message: string | null
  busy: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  confirm: []
}>()

function close(open: boolean) {
  if (!open && props.busy) return
  emit('update:open', open)
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="close"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Kirim ke Penilaian</DialogTitle>
        <DialogDescription>
          Nilai siswa yang hadir dikirim ke penilaian.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-3">
        <p
          v-if="message"
          class="text-control text-destructive"
          role="alert"
        >
          {{ message }}
        </p>
        <template v-if="missingNames.length > 0">
          <p class="text-control">
            {{ missingNames.length }} siswa belum dinilai dan tidak ikut
            dikirim:
          </p>
          <ul
            data-test="missing"
            class="list-disc space-y-0.5 pl-4 text-control font-medium"
          >
            <li
              v-for="(name, index) in missingNames"
              :key="`${index}-${name}`"
            >
              {{ name }}
            </li>
          </ul>
          <p class="text-control text-muted-foreground">
            Nilai mereka bisa dikirim nanti setelah diisi.
          </p>
        </template>
        <p
          v-else
          class="text-control"
        >
          Semua siswa yang hadir sudah dinilai. Nilai siswa yang tidak hadir
          tidak dikirim.
        </p>
      </DialogBody>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          variant="outline"
          :disabled="busy"
          @click="close(false)"
        >
          Batal
        </Button>
        <Button
          :disabled="busy"
          @click="emit('confirm')"
        >
          {{
            busy
              ? 'Mengirim...'
              : missingNames.length > 0
                ? 'Kirim tanpa siswa ini'
                : 'Kirim'
          }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
