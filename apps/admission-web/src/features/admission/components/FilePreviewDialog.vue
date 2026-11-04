<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Download } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { admissionApi } from '../api/admissionApi'
import type { PreviewFile } from '../types'
import { admissionBlobErrorMessage } from '../utils'

const props = defineProps<{ open: boolean; file: PreviewFile | null }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const url = ref<string | null>(null)
const loading = ref(false)
const error = ref('')
let request = 0

const kind = computed(() => {
  const type = props.file?.mimeType ?? ''
  if (type.startsWith('image/')) return 'image'
  if (type === 'application/pdf') return 'pdf'
  return 'other'
})

function release() {
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = null
}

async function load() {
  release()
  error.value = ''
  const file = props.file
  const current = ++request
  loading.value = false
  if (!file || kind.value === 'other') return
  loading.value = true
  try {
    const response = await admissionApi.getFile(file.id)
    if (current !== request) return
    url.value = URL.createObjectURL(response.data)
  } catch (failure: unknown) {
    if (current === request) {
      error.value = await admissionBlobErrorMessage(
        failure,
        'Gagal memuat berkas.',
      )
    }
  } finally {
    if (current === request) loading.value = false
  }
}

async function download() {
  const file = props.file
  if (!file) return
  try {
    const response = await admissionApi.getFile(file.id, true)
    const href = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = href
    link.download = file.originalName
    link.click()
    setTimeout(() => URL.revokeObjectURL(href), 0)
  } catch (failure: unknown) {
    toast.error(
      await admissionBlobErrorMessage(failure, 'Gagal mengunduh berkas.'),
    )
  }
}

watch(
  () => [props.open, props.file?.id] as const,
  ([open]) => {
    if (open) {
      void load()
    } else {
      request++
      loading.value = false
      release()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  request++
  release()
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent
      class="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
    >
      <DialogHeader standard>
        <DialogTitle class="break-all">{{ file?.originalName }}</DialogTitle>
        <DialogDescription class="sr-only">Pratinjau berkas</DialogDescription>
      </DialogHeader>
      <div class="min-h-0 flex-1 overflow-auto p-4">
        <p
          v-if="loading"
          class="py-10 text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Memuat berkas…
        </p>
        <div
          v-else-if="error"
          role="alert"
          class="space-y-3 rounded-md border border-destructive/40 p-4 text-[length:var(--text-control,0.75rem)]"
        >
          <p>{{ error }}</p>
          <Button
            type="button"
            variant="outline"
            @click="load"
          >
            Coba lagi
          </Button>
        </div>
        <img
          v-else-if="kind === 'image' && url"
          :src="url"
          :alt="file?.originalName"
          class="mx-auto max-h-[70dvh] max-w-full object-contain"
        />
        <iframe
          v-else-if="kind === 'pdf' && url"
          :src="url"
          :title="file?.originalName"
          class="h-[70dvh] w-full rounded-md border"
        />
        <p
          v-else-if="kind === 'other'"
          class="py-10 text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Pratinjau tidak tersedia untuk jenis berkas ini. Unduh untuk
          membukanya.
        </p>
      </div>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          @click="emit('update:open', false)"
        >
          Tutup
        </Button>
        <Button
          type="button"
          @click="download"
        >
          <Download class="mr-1.5 size-4" />
          Unduh
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
