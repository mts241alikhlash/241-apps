<script setup lang="ts" generic="T extends CardEntry">
import { Trash2 } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
} from '@mts241alikhlash/ui/item'
import { typeCode, typeLabel } from '@/features/exam-bank/types'
import type { CardEntry } from '../types'

defineProps<{
  cards: T[]
  activeIndex: number
  snippetOf: (card: T) => string
}>()

const emit = defineEmits<{
  select: [index: number]
  remove: [index: number]
}>()
</script>

<template>
  <ItemGroup class="gap-0 divide-y divide-border">
    <Item
      v-for="(card, index) in cards"
      :key="card.key"
      class="min-w-0 flex-nowrap gap-1.5 rounded-none border-0 px-2 py-1.5 hover:bg-muted"
      :class="index === activeIndex ? 'bg-muted' : undefined"
    >
      <ItemContent class="min-w-0">
        <button
          type="button"
          class="flex min-h-8 w-full min-w-0 items-center gap-2 text-left"
          :aria-current="index === activeIndex ? 'true' : undefined"
          @click="emit('select', index)"
        >
          <span
            class="w-5 shrink-0 text-right text-control text-muted-foreground tabular-nums"
          >
            {{ index + 1 }}
          </span>
          <span class="min-w-0 flex-1 truncate text-control">
            {{ snippetOf(card) }}
          </span>
          <span
            v-if="card.error"
            class="sr-only"
            >(belum valid)</span
          >
        </button>
      </ItemContent>
      <ItemActions class="shrink-0">
        <span
          class="w-8 shrink-0 text-right text-control text-muted-foreground"
          :title="typeLabel(card.type)"
        >
          {{ typeCode(card.type) }}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          :aria-label="`Hapus soal ${index + 1}`"
          :disabled="cards.length === 1"
          @click="emit('remove', index)"
        >
          <Trash2 />
        </Button>
      </ItemActions>
    </Item>
  </ItemGroup>
</template>
