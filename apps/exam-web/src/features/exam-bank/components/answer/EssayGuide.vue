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
  <RichQuestionText
    :model-value="html"
    label="Pedoman penilaian"
    @update:model-value="setGuide"
  />
</template>
