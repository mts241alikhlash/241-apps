<script setup lang="ts">
import { computed } from 'vue'
import type { EssayContent } from '../../types'
import RichQuestionText from '../RichQuestionText.vue'

const content = defineModel<EssayContent>({ required: true })

const html = computed(() => content.value.guideHtml ?? '')

function setGuide(next: string) {
  content.value = { guideHtml: next === '' ? null : next }
}
</script>

<template>
  <div class="space-y-2">
    <p class="text-[length:var(--text-control,0.75rem)] text-muted-foreground">
      Pedoman penilaian untuk pemeriksa (boleh dikosongkan). Siswa tidak
      melihatnya.
    </p>
    <RichQuestionText
      :model-value="html"
      label="Pedoman penilaian"
      @update:model-value="setGuide"
    />
  </div>
</template>
