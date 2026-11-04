<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { Label } from '@mts241alikhlash/ui/label'
import { ImagePlus, Upload } from '@lucide/vue'
import { mediaService } from '../services/mediaService'
import type { MediaLibraryItem, MediaSelection } from '../types'

const open = defineModel<boolean>('open', { required: true })

const props = withDefaults(defineProps<{ withCaption?: boolean }>(), {
  withCaption: false,
})

const emit = defineEmits<{ select: [MediaSelection] }>()

const items = ref<MediaLibraryItem[]>([])
const loading = ref(false)
const uploading = ref(false)
const selectedId = ref<string | null>(null)
const altText = ref('')
const caption = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const selected = computed(
  () => items.value.find((item) => item.id === selectedId.value) ?? null,
)
const canConfirm = computed(
  () => Boolean(selected.value) && altText.value.trim().length > 0,
)

watch(open, async (isOpen) => {
  if (!isOpen) return
  selectedId.value = null
  altText.value = ''
  caption.value = ''
  loading.value = true
  items.value = await mediaService.library()
  loading.value = false
})

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  const uploaded = await mediaService.upload(file)
  uploading.value = false
  input.value = ''

  if (uploaded) {
    items.value = [uploaded, ...items.value]
    selectedId.value = uploaded.id
  }
}

function confirm() {
  if (!selected.value || !canConfirm.value) return
  emit('select', {
    fileId: selected.value.id,
    publicUrl: selected.value.publicUrl,
    altText: altText.value.trim(),
    ...(props.withCaption && caption.value.trim()
      ? { caption: caption.value.trim() }
      : {}),
  })
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Galeri Media</DialogTitle>
        <DialogDescription>
          Pilih gambar yang sudah diunggah, atau unggah yang baru. Gambar hanya
          dapat dilihat publik selama dipakai konten yang sudah terbit.
        </DialogDescription>
      </DialogHeader>

      <div class="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          :disabled="uploading"
          @click="fileInput?.click()"
        >
          <Upload class="mr-2 size-4" />
          {{ uploading ? 'Mengunggah…' : 'Unggah gambar' }}
        </Button>
        <span class="text-xs text-muted-foreground">
          JPG, PNG, atau WebP, maksimal 5 MB
        </span>
      </div>

      <p
        v-if="loading"
        class="py-10 text-center text-sm text-muted-foreground"
      >
        Memuat galeri…
      </p>

      <div
        v-else-if="items.length === 0"
        class="rounded-md border border-dashed p-10 text-center"
      >
        <ImagePlus class="mx-auto size-8 text-muted-foreground" />
        <p class="mt-2 text-sm text-muted-foreground">
          Belum ada gambar. Unggah yang pertama.
        </p>
      </div>

      <div
        v-else
        class="grid max-h-72 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4"
      >
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="overflow-hidden rounded-md border-2 transition-colors"
          :class="
            selectedId === item.id ? 'border-primary' : 'border-transparent'
          "
          :aria-pressed="selectedId === item.id"
          @click="selectedId = item.id"
        >
          <img
            :src="item.previewUrl"
            :alt="item.originalName"
            loading="lazy"
            class="aspect-square w-full object-cover"
          />
        </button>
      </div>

      <div
        v-if="selected"
        class="space-y-1.5"
      >
        <Label for="media-alt">
          Teks alternatif <span class="text-destructive">*</span>
        </Label>
        <Input
          id="media-alt"
          v-model="altText"
          placeholder="Jelaskan isi gambar, mis. Penyerahan piala di aula madrasah"
        />
        <p class="text-xs text-muted-foreground">
          Dibaca pembaca layar dan tampil saat gambar gagal dimuat. Wajib diisi.
        </p>
      </div>

      <div
        v-if="selected && props.withCaption"
        class="space-y-1.5"
      >
        <Label for="media-caption">Keterangan foto</Label>
        <Input
          id="media-caption"
          v-model="caption"
          placeholder="Opsional: tampil di bawah foto saat dibuka"
        />
        <p class="text-xs text-muted-foreground">
          Berbeda dari teks alternatif: keterangan dibaca semua pengunjung, teks
          alternatif menggantikan gambar bagi yang tidak melihatnya.
        </p>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          @click="open = false"
        >
          Batal
        </Button>
        <Button
          type="button"
          :disabled="!canConfirm"
          @click="confirm"
        >
          Gunakan gambar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <input
    ref="fileInput"
    type="file"
    accept="image/jpeg,image/png,image/webp"
    class="hidden"
    @change="handleUpload"
  />
</template>
