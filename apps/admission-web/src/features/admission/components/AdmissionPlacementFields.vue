<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { FormControl } from '@mts241alikhlash/ui/form'
import FloatingField from './AdmissionField.vue'
import { ADMISSION_TYPE_LABELS, type AdmissionGrade } from '../types'

defineProps<{ grades: AdmissionGrade[]; disabled?: boolean }>()
</script>

<template>
  <FloatingField
    v-slot="{ value, handleChange }"
    name="admissionType"
    label="Jenis Pendaftaran"
    required
  >
    <Select
      :model-value="value"
      :disabled="disabled"
      @update:model-value="handleChange"
    >
      <FormControl>
        <SelectTrigger class="w-full">
          <SelectValue />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        <SelectItem
          v-for="(label, type) in ADMISSION_TYPE_LABELS"
          :key="type"
          :value="type"
        >
          {{ label }}
        </SelectItem>
      </SelectContent>
    </Select>
  </FloatingField>

  <FloatingField
    v-slot="{ value, handleChange }"
    name="targetGradeId"
    label="Tingkat Kelas yang Dituju"
    required
  >
    <Select
      :model-value="value"
      :disabled="disabled || grades.length === 0"
      @update:model-value="handleChange"
    >
      <FormControl>
        <SelectTrigger class="w-full">
          <SelectValue />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        <SelectItem
          v-for="grade in grades"
          :key="grade.id"
          :value="grade.id"
        >
          {{ grade.name ?? `Kelas ${grade.level}` }}
        </SelectItem>
      </SelectContent>
    </Select>
  </FloatingField>
</template>
