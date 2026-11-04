<script setup lang="ts">
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { FormControl, FloatingField } from '@mts241alikhlash/ui/form'
import type { Classroom } from '@/features/academic/classroom'
import type { GradeOption } from '../../types'

defineProps<{
  grades: GradeOption[]
  filteredClassrooms: Classroom[]
  setFieldValue: (field: string, value: unknown) => void
}>()
</script>

<template>
  <div class="grid gap-5 md:grid-cols-2 items-start">
    <FloatingField
      v-slot="{ componentField }"
      name="nis"
      label="NIS"
      required
    >
      <div class="content-start">
        <FormControl>
          <Input
            maxlength="20"
            v-bind="componentField"
          />
        </FormControl>
      </div>
    </FloatingField>
    <FloatingField
      v-slot="{ componentField }"
      name="nisn"
      label="NISN"
      required
    >
      <div class="content-start">
        <FormControl>
          <Input
            maxlength="20"
            v-bind="componentField"
          />
        </FormControl>
      </div>
    </FloatingField>
    <FloatingField
      v-slot="{ value, handleChange }"
      name="gradeId"
      label="Tingkat"
    >
      <div class="content-start">
        <Select
          :model-value="value"
          @update:model-value="
            (val) => {
              handleChange(val)
              setFieldValue('classroomId', '')
            }
          "
        >
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Pilih tingkat (opsional)" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem
              v-for="lvl in grades"
              :key="lvl.id"
              :value="lvl.id"
            >
              {{ lvl.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </FloatingField>
    <FloatingField
      v-slot="{ value, handleChange }"
      name="classroomId"
      label="Kelas"
    >
      <div class="content-start">
        <Select
          :model-value="value"
          @update:model-value="handleChange"
        >
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Pilih kelas (opsional)" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem
              v-for="cls in filteredClassrooms"
              :key="cls.id"
              :value="cls.id"
            >
              {{ cls.displayName }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </FloatingField>
  </div>
</template>
