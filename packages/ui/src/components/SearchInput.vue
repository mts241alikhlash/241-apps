<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Search } from '@lucide/vue'
import { Input } from '@mts241alikhlash/ui/input'
import { cn } from '@mts241alikhlash/ui/utils'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label?: string
    class?: HTMLAttributes['class']
  }>(),
  { label: 'Cari' },
)

const model = defineModel<string>()
</script>

<template>
  <div :class="cn('relative w-full sm:w-48', props.class)">
    <Search
      class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      aria-hidden="true"
    />
    <Input
      v-bind="$attrs"
      :model-value="model"
      type="search"
      :aria-label="label"
      placeholder="Cari"
      class="pl-8 [&::-webkit-search-cancel-button]:appearance-none"
      @update:model-value="model = String($event)"
    />
  </div>
</template>
