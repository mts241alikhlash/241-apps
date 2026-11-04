<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'

const props = defineProps<{
  page: number
  pageSize: number
  total: number
  itemLabel: string
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:page': [page: number] }>()

const pageCount = computed(() =>
  Math.max(1, Math.ceil(props.total / props.pageSize)),
)
const from = computed(() =>
  props.total ? (props.page - 1) * props.pageSize + 1 : 0,
)
const to = computed(() => Math.min(props.page * props.pageSize, props.total))
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-between gap-2 text-[length:var(--text-control,0.75rem)]"
    data-test="server-pager"
  >
    <span class="text-muted-foreground">
      {{ from }}–{{ to }} dari {{ total }} {{ itemLabel }}
    </span>
    <div
      v-if="pageCount > 1"
      class="flex flex-wrap items-center gap-2"
    >
      <span class="text-muted-foreground"
        >Halaman {{ page }} dari {{ pageCount }}</span
      >
      <Button
        variant="outline"
        data-test="pager-previous"
        :disabled="disabled || page <= 1"
        @click="emit('update:page', page - 1)"
      >
        Sebelumnya
      </Button>
      <Button
        variant="outline"
        data-test="pager-next"
        :disabled="disabled || page >= pageCount"
        @click="emit('update:page', page + 1)"
      >
        Selanjutnya
      </Button>
    </div>
  </div>
</template>
