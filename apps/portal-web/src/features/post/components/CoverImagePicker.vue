<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { Label } from '@mts241alikhlash/ui/label'
import { ImagePlus, Trash2 } from '@lucide/vue'
import { MediaLibraryDialog, type MediaSelection } from '@/features/media'

const fileId = defineModel<string | null>('fileId', { required: true })
const altText = defineModel<string>('altText', { required: true })

const props = defineProps<{ previewUrl?: string | null }>()

const libraryOpen = ref(false)
const pickedUrl = ref<string | null>(null)

const previewSrc = computed(() => pickedUrl.value ?? props.previewUrl ?? null)

function onSelect(selection: MediaSelection) {
  fileId.value = selection.fileId
  altText.value = selection.altText
  pickedUrl.value = selection.publicUrl
}

function clear() {
  fileId.value = null
  altText.value = ''
  pickedUrl.value = null
}
</script>

<template>
  <div class="space-y-3">
    <Label>Gambar Sampul</Label>

    <div
      v-if="fileId"
      class="space-y-3"
    >
      <img
        v-if="previewSrc"
        :src="previewSrc"
        :alt="altText || 'Pratinjau gambar sampul'"
        class="h-40 w-full rounded-md border object-cover"
      />

      <div class="space-y-1.5">
        <Label for="cover-alt">
          Teks alternatif
          <span class="text-destructive">*</span>
        </Label>
        <Input
          id="cover-alt"
          v-model="altText"
          placeholder="Jelaskan isi gambar, mis. Penyerahan piala di aula madrasah"
        />
        <p class="text-xs text-muted-foreground">
          Dibaca pembaca layar dan tampil saat gambar gagal dimuat. Wajib diisi
          sebelum konten dapat diterbitkan.
        </p>
      </div>

      <div class="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          @click="libraryOpen = true"
        >
          Ganti gambar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          @click="clear"
        >
          <Trash2 class="mr-2 size-4" />
          Hapus gambar
        </Button>
      </div>
    </div>

    <div
      v-else
      class="rounded-md border border-dashed p-6 text-center"
    >
      <ImagePlus class="mx-auto size-8 text-muted-foreground" />
      <p class="mt-2 text-sm text-muted-foreground">
        Pilih dari galeri atau unggah gambar baru
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="mt-3"
        @click="libraryOpen = true"
      >
        Pilih gambar
      </Button>
    </div>

    <MediaLibraryDialog
      v-model:open="libraryOpen"
      @select="onSelect"
    />
  </div>
</template>
