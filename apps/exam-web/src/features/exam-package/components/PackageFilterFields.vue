<script setup lang="ts">
import { useId } from 'vue'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import type { NamedOption } from '@/features/exam-bank/types'
import { PACKAGE_STATUSES, packageStatusLabel } from '../types'

defineProps<{
  subjects: NamedOption[]
  grades: NamedOption[]
}>()

const subjectId = defineModel<string>('subjectId', { required: true })
const gradeId = defineModel<string>('gradeId', { required: true })
const status = defineModel<string>('status', { required: true })

const id = useId()
</script>

<template>
  <FloatingLabelField
    label="Mapel"
    :for="`${id}-subject`"
    class="w-fit min-w-28"
    floating
  >
    <Select v-model="subjectId">
      <SelectTrigger
        :id="`${id}-subject`"
        class="w-full"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">Semua</SelectItem>
        <SelectItem
          v-for="subject in subjects"
          :key="subject.id"
          :value="subject.id"
        >
          {{ subject.name }}
        </SelectItem>
      </SelectContent>
    </Select>
  </FloatingLabelField>
  <FloatingLabelField
    label="Tingkat"
    :for="`${id}-grade`"
    class="w-fit min-w-28"
    floating
  >
    <Select v-model="gradeId">
      <SelectTrigger
        :id="`${id}-grade`"
        class="w-full"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">Semua</SelectItem>
        <SelectItem
          v-for="grade in grades"
          :key="grade.id"
          :value="grade.id"
        >
          {{ grade.name }}
        </SelectItem>
      </SelectContent>
    </Select>
  </FloatingLabelField>
  <FloatingLabelField
    label="Status"
    :for="`${id}-status`"
    class="w-fit min-w-28"
    floating
  >
    <Select v-model="status">
      <SelectTrigger
        :id="`${id}-status`"
        class="w-full"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">Semua</SelectItem>
        <SelectItem
          v-for="option in PACKAGE_STATUSES"
          :key="option"
          :value="option"
        >
          {{ packageStatusLabel(option) }}
        </SelectItem>
      </SelectContent>
    </Select>
  </FloatingLabelField>
</template>
