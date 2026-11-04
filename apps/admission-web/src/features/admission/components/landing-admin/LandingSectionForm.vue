<script setup lang="ts">
import { watch } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import type { LandingSectionConfig } from '../../data/landingFormConfig'
import { useLandingSectionForm } from '../../composables/useLandingSectionForm'
import type { LandingDraftOverview } from '../../types/landing'
import LandingFieldTree from './LandingFieldTree.vue'

const props = defineProps<{
  config: LandingSectionConfig
  initial: object
  disabled: boolean
}>()

const emit = defineEmits<{
  saved: [overview: LandingDraftOverview]
  dirty: [value: boolean]
}>()

const form = useLandingSectionForm(props.config, props.initial)

watch(form.dirty, (value) => emit('dirty', value))
watch(
  () => props.initial,
  (content) => {
    if (!form.dirty.value) form.reset(content)
  },
)

async function save() {
  const overview = await form.save()
  if (overview) emit('saved', overview)
}

defineExpose({ reset: form.reset, dirty: form.dirty })
</script>

<template>
  <div class="space-y-6">
    <p class="text-[length:var(--text-control,0.75rem)] text-muted-foreground">
      {{ config.hint }}
    </p>
    <LandingFieldTree
      :fields="config.fields"
      :model="form.values.value as Record<string, unknown>"
      :errors="form.errors.value"
      :disabled="disabled || form.saving.value"
      @change="form.setField"
      @add="form.add"
      @remove="form.remove"
      @move="form.move"
    />
    <div class="flex flex-wrap gap-2 border-t pt-4">
      <Button
        type="button"
        :disabled="disabled || !form.dirty.value || form.saving.value"
        @click="save"
      >
        {{ form.saving.value ? 'Menyimpan…' : 'Simpan draf' }}
      </Button>
      <Button
        type="button"
        variant="outline"
        :disabled="disabled || form.saving.value"
        @click="form.fillBuiltIn()"
      >
        Isi dengan bawaan
      </Button>
    </div>
  </div>
</template>
