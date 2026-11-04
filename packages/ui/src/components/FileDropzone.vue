<script setup lang="ts">
import { ref } from 'vue'
import type { HTMLAttributes } from 'vue'
import { FileText, UploadCloud, XCircle } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import { cn } from '@mts241alikhlash/ui/utils'

const props = withDefaults(
  defineProps<{
    accept?: string
    hint?: string
    placeholder?: string
    fileName?: string | null
    clearable?: boolean
    disabled?: boolean
    invalid?: boolean
    ariaLabel?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    accept: '.jpg,.jpeg,.png,.pdf',
    placeholder: 'Klik atau tarik file ke sini',
    clearable: false,
    disabled: false,
    invalid: false,
  },
)

const emit = defineEmits<{ change: [event: Event]; clear: [] }>()

const input = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

function onDrop(event: DragEvent) {
  dragging.value = false
  if (!input.value || !event.dataTransfer || props.disabled) return
  input.value.files = event.dataTransfer.files
  input.value.dispatchEvent(new Event('change', { bubbles: true }))
}
</script>

<template>
  <div
    v-if="fileName && clearable"
    data-slot="file-dropzone-selected"
    :class="
      cn(
        'flex min-w-0 items-center gap-3 rounded-md border bg-muted/30 p-3 text-[length:var(--text-control,0.75rem)]',
        props.class,
      )
    "
  >
    <span class="shrink-0 rounded-md bg-primary/10 p-2 text-primary">
      <FileText class="size-4" />
    </span>
    <span class="min-w-0 flex-1 truncate font-medium">{{ fileName }}</span>
    <Button
      type="button"
      variant="ghost"
      size="icon"
      class="shrink-0"
      aria-label="Lepas berkas"
      :disabled="disabled"
      @click="emit('clear')"
    >
      <XCircle />
    </Button>
  </div>
  <label
    v-else
    data-slot="file-dropzone"
    :data-invalid="invalid || undefined"
    :class="
      cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/25 p-5 text-center text-[length:var(--text-control,0.75rem)] transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring data-[invalid]:border-destructive/60',
        dragging && 'border-primary bg-primary/5',
        disabled && 'pointer-events-none opacity-60',
        props.class,
      )
    "
    @dragover.prevent="dragging = true"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
  >
    <span class="rounded-full bg-primary/10 p-2 text-primary">
      <UploadCloud class="size-5" />
    </span>
    <span class="min-w-0 break-all font-medium">{{
      fileName || placeholder
    }}</span>
    <span
      v-if="hint"
      class="text-xs text-muted-foreground"
      >{{ hint }}</span
    >
    <input
      ref="input"
      type="file"
      class="sr-only"
      :accept="accept"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :aria-invalid="invalid || undefined"
      @change="emit('change', $event)"
    />
  </label>
</template>
