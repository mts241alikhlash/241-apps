<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import { imageUrl } from '../../composables/useLandingContent'
import { landingService } from '../../services/landingService'
import type { LandingImagePurpose, LandingImageRef } from '../../types/landing'
import { imageFileError } from '../../utils'

const props = defineProps<{
  modelValue: LandingImageRef | null
  purpose: LandingImagePurpose
  label: string
  optional?: boolean
  builtIn?: string
  disabled?: boolean
  error?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: LandingImageRef | null]
}>()

const inputId = useId()
const input = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const localError = ref<string | null>(null)

const preview = computed(() =>
  props.modelValue ? imageUrl(props.modelValue) : null,
)
const shownError = computed<string | null>(
  () => localError.value ?? props.error ?? null,
)

async function onPick(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const problem = imageFileError(file)
  localError.value = problem
  if (problem) {
    if (input.value) input.value.value = ''
    return
  }
  uploading.value = true
  const result = await landingService.uploadImage(file, props.purpose)
  uploading.value = false
  if (input.value) input.value.value = ''
  if ('error' in result) {
    localError.value = result.error
    return
  }
  emit('update:modelValue', { imageId: result.id })
}
</script>

<template>
  <div class="space-y-2">
    <p class="text-[length:var(--text-control,0.75rem)] font-medium">
      {{ label }}
    </p>
    <div class="flex flex-wrap items-start gap-3">
      <div
        class="flex w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30"
        :class="purpose === 'poster' ? 'aspect-[9/16]' : 'aspect-[3/2]'"
      >
        <img
          v-if="preview"
          :src="preview"
          alt=""
          class="size-full object-cover"
        />
        <span
          v-else
          class="px-2 text-center text-xs text-muted-foreground"
          >Belum ada foto</span
        >
      </div>
      <div class="flex min-w-0 flex-1 flex-col items-start gap-2">
        <label
          :for="inputId"
          class="sr-only"
          >{{ label }}</label
        >
        <input
          :id="inputId"
          ref="input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="sr-only"
          tabindex="-1"
          :disabled="disabled || uploading"
          @change="onPick"
        />
        <Button
          type="button"
          variant="outline"
          :aria-label="`${uploading ? 'Mengunggah' : preview ? 'Ganti foto' : 'Unggah foto'}: ${label}`"
          :disabled="disabled || uploading"
          @click="input?.click()"
        >
          {{
            uploading ? 'Mengunggah…' : preview ? 'Ganti foto' : 'Unggah foto'
          }}
        </Button>
        <Button
          v-if="builtIn"
          type="button"
          variant="ghost"
          :aria-label="`Pakai foto bawaan: ${label}`"
          :disabled="disabled || uploading"
          @click="emit('update:modelValue', { src: builtIn })"
        >
          Pakai foto bawaan
        </Button>
        <Button
          v-if="optional && modelValue"
          type="button"
          variant="ghost"
          :aria-label="`Hapus foto: ${label}`"
          :disabled="disabled || uploading"
          @click="emit('update:modelValue', null)"
        >
          Hapus foto
        </Button>
        <p class="text-xs text-muted-foreground">
          JPG, PNG, atau WebP, maksimal 5 MB. Diubah otomatis ke WebP{{
            purpose === 'poster' ? ' (poster maks. 1080 × 1920)' : ''
          }}.
        </p>
      </div>
    </div>
    <p
      v-if="shownError"
      role="alert"
      class="text-xs text-destructive"
    >
      {{ shownError }}
    </p>
  </div>
</template>
