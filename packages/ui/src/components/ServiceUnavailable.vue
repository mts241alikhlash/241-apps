<script setup lang="ts">
import { computed } from 'vue'
import { RotateCw, ServerCrash } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
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
  <Alert
    variant="destructive"
    class="my-2"
  >
    <ServerCrash />
    <AlertTitle>{{ title }}</AlertTitle>
    <AlertDescription>
      <p>{{ message }}</p>
      <p class="text-muted-foreground mt-1 text-xs">
        Data yang ada tidak hilang, hanya belum bisa diambil sekarang.
      </p>

      <Button
        v-if="retry"
        variant="outline"
        size="sm"
        class="mt-3"
        :disabled="isRetrying"
        @click="retry"
      >
        <RotateCw
          class="size-3.5"
          :class="isRetrying && 'animate-spin'"
        />
        {{ isRetrying ? 'Mencoba lagi…' : 'Coba lagi' }}
      </Button>
    </AlertDescription>
  </Alert>
</template>
