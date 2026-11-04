<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'

defineProps<{
  modelValue: string
  label: string
  options: { id: string; name: string }[]
  disabled?: boolean
  loading?: boolean
  invalid?: boolean
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <Select
    :model-value="modelValue"
    :disabled="disabled"
    @update:model-value="$emit('update:modelValue', String($event))"
  >
    <SelectTrigger
      class="w-full aria-invalid:data-[placeholder]:text-destructive"
      :aria-label="label"
      :aria-invalid="invalid || undefined"
    >
      <SelectValue :placeholder="loading ? 'Memuat…' : `Pilih ${label}`" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem
        v-for="option in options"
        :key="option.id"
        :value="option.id"
      >
        {{ option.name }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
