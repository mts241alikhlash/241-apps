<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { ComponentPublicInstance, HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'
import { Primitive } from 'reka-ui'
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { injectQuestionnaireItemContext } from './useQuestionnaire'

const props = withDefaults(defineProps<PrimitiveProps & {
  class?: HTMLAttributes['class']
  id?: string
}>(), {
  as: 'p',
})

const item = injectQuestionnaireItemContext()

const primitiveRef = ref<ComponentPublicInstance | null>(null)
const fallbackId = props.id ?? useId()
const descriptionId = ref(fallbackId)

let unregisterDescription = item.registerDescription(descriptionId.value)

onMounted(() => {
  const element = primitiveRef.value?.$el as HTMLElement | undefined
  const renderedId = element?.id

  if (!renderedId) {
    if (element) {
      element.id = fallbackId
    }

    return
  }

  if (renderedId !== descriptionId.value) {
    unregisterDescription()
    descriptionId.value = renderedId
    unregisterDescription = item.registerDescription(renderedId)
  }
})

onBeforeUnmount(() => unregisterDescription())
</script>

<template>
  <Primitive
    v-bind="props.asChild ? {} : { id: descriptionId }"
    ref="primitiveRef"
    data-slot="questionnaire-description"
    :as="props.as"
    :as-child="props.asChild"
    :class="cn('text-xs/relaxed text-pretty text-muted-foreground', props.class)"
  >
    <slot />
  </Primitive>
</template>
