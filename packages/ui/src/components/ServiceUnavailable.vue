<script setup lang="ts">
import { computed } from 'vue'
import { RotateCw, ServerCrash } from '@lucide/vue'
import { Button } from './ui/button'

const props = defineProps<{
  message: string
  subject?: string
  retry?: () => void
  isRetrying?: boolean
}>()

const title = computed(() =>
  props.subject
    ? `${props.subject} belum bisa dimuat`
    : 'Data belum bisa dimuat',
)
</script>

<template>
  <div
    class="my-2 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-start"
    role="alert"
  >
    <span
      class="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
      aria-hidden="true"
    >
      <ServerCrash class="size-4" />
    </span>
    <div class="min-w-0 flex-1 space-y-1">
      <p class="text-control font-medium">{{ title }}</p>
      <p class="text-control wrap-break-word text-muted-foreground">
        {{ message }}
      </p>
      <p class="text-xs text-muted-foreground">
        Data yang ada tidak hilang, hanya belum bisa diambil sekarang.
      </p>
    </div>
    <Button
      v-if="retry"
      variant="outline"
      size="sm"
      class="shrink-0 self-start"
      :disabled="isRetrying"
      @click="retry"
    >
      <RotateCw
        class="size-3.5"
        :class="isRetrying && 'animate-spin'"
      />
      {{ isRetrying ? 'Mencoba lagi…' : 'Coba lagi' }}
    </Button>
  </div>
</template>
