<script setup lang="ts">
import 'katex/dist/katex.min.css'
import { computed } from 'vue'
import { renderLatex } from '../utils/renderMath'

const props = defineProps<{ latex: string }>()

const html = computed(() => renderLatex(props.latex))
</script>

<template>
  <div
    class="min-h-8 overflow-x-auto rounded-md border bg-muted/30 px-3 py-2"
    data-testid="math-preview"
    v-html="html"
  />
</template>
