<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <tr
    data-slot="table-row"
    :class="
      cn(
        'border-b transition-colors hover:bg-table-stripe-hover data-[state=selected]:bg-table-stripe',
        props.class,
      )
    "
  >
    <slot />
  </tr>
</template>
