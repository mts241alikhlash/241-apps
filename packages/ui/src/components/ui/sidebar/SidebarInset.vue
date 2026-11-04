<script setup lang="ts">
import { cn } from '@mts241alikhlash/ui/utils'
import type { HTMLAttributes } from 'vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <main
    data-slot="sidebar-inset"
    :class="
      cn(
        'bg-background relative flex w-full flex-1 flex-col',
        'peer-data-[variant=inset]:m-2 peer-data-[variant=inset]:rounded-md peer-data-[variant=inset]:border peer-data-[variant=inset]:border-sidebar-border peer-data-[variant=inset]:bg-card peer-data-[variant=inset]:shadow-xs md:peer-data-[variant=inset]:ml-0',
        props.class,
      )
    "
  >
    <slot />
  </main>
</template>
