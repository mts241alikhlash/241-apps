<script setup lang="ts">
import type { ListboxFilterProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Search } from '@lucide/vue'
import { ListboxFilter, useForwardProps } from 'reka-ui'
import { cn } from '@mts241alikhlash/ui/utils'
import { useCommand } from '.'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<
  ListboxFilterProps & {
    class?: HTMLAttributes['class']
  }
>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)

const { filterState } = useCommand()
</script>

<template>
  <div
    data-slot="command-input-wrapper"
    class="p-1 pb-0"
  >
    <div class="border-input bg-input/20 dark:bg-input/30 flex h-[var(--control-h-lg,2rem)] items-center gap-2 rounded-md border px-2">
      <Search class="size-[var(--icon-control,0.875rem)] shrink-0 opacity-50" />
      <ListboxFilter
        v-bind="{ ...forwardedProps, ...$attrs }"
        v-model="filterState.search"
        data-slot="command-input"
        auto-focus
        :class="
          cn(
            'placeholder:text-muted-foreground flex w-full bg-transparent text-[length:var(--text-control,0.75rem)] outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
            props.class,
          )
        "
      />
    </div>
  </div>
</template>
