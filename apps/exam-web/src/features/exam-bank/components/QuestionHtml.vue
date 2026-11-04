<script setup lang="ts">
import 'katex/dist/katex.min.css'
import { computed, nextTick, ref, watch } from 'vue'
import { loadExamImage } from '../composables/useExamImage'
import { renderMath } from '../utils/renderMath'
import { sanitizeQuestionHtml } from '../utils/sanitizeHtml'

const props = defineProps<{ html: string }>()

const root = ref<HTMLElement | null>(null)
const rendered = computed(() => renderMath(sanitizeQuestionHtml(props.html)))

async function showImages() {
  await nextTick()
  const images =
    root.value?.querySelectorAll<HTMLImageElement>('img[data-file-id]')
  for (const image of images ?? []) {
    const id = image.dataset.fileId
    if (!id || image.src) continue
    try {
      image.src = await loadExamImage(id)
    } catch {
      image.alt = 'Gambar tidak bisa dimuat'
    }
  }
}

watch([rendered, root], () => void showImages(), { immediate: true })
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- question HTML passed through sanitizeQuestionHtml, then KaTeX -->
  <div
    ref="root"
    class="question-html max-w-none text-[length:var(--text-control,0.75rem)] [&_img]:max-h-64 [&_img]:max-w-full [&_img]:rounded-md [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_table]:border [&_td]:border [&_td]:px-2 [&_ul]:list-disc [&_ul]:pl-5"
    dir="auto"
    v-html="rendered"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>
