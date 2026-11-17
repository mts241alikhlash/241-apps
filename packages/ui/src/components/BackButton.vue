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
    variant="ghost"
    size="icon"
    class="-ml-1 size-[var(--control-h-md,2rem)] shrink-0"
    :aria-label="label"
    :title="label"
  >
    <ArrowLeft />
  </Button>
</template>
