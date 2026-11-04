<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'

defineProps<{
  label: string
}>()
</script>

<template>
  <Button
    type="button"
    variant="outline"
    size="icon"
    class="size-[var(--control-h-md,1.75rem)] shrink-0"
    :aria-label="label"
    :title="label"
  >
    <ArrowLeft />
  </Button>
</template>
