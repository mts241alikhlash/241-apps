<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs'

const props = withDefaults(
  defineProps<{
    tabs: { value: string; label: string; disabled?: boolean }[]
    modelValue?: string
    defaultValue?: string
    start?: 'field' | 'block'
    class?: HTMLAttributes['class']
  }>(),
  { start: 'block' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <Tabs
    variant="line"
    :model-value="props.modelValue"
    :default-value="props.defaultValue"
    :class="cn('gap-0', props.class)"
    @update:model-value="emit('update:modelValue', String($event))"
  >
    <TabsList class="bg-muted/30 px-4 sm:px-6">
      <TabsTrigger
        v-for="tab in props.tabs"
        :key="tab.value"
        :value="tab.value"
        :disabled="tab.disabled"
      >
        {{ tab.label }}
      </TabsTrigger>
    </TabsList>
    <TabsContent
      v-for="tab in props.tabs"
      :key="tab.value"
      :value="tab.value"
      :class="
        cn(
          'px-4 pb-4 sm:px-6 sm:pb-6',
          props.start === 'field' ? 'pt-0' : 'pt-4',
        )
      "
    >
      <slot :name="tab.value" />
    </TabsContent>
  </Tabs>
</template>
