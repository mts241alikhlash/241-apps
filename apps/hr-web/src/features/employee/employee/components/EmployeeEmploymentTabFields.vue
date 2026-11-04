<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import {
  FormControl,
  FloatingField,
  FloatingLabelField,
} from '@mts241alikhlash/ui/form'
import type {
  EmploymentTypeOption,
  PositionCategoryRef,
  PositionListItem,
} from '../types'
import { positionCategoryLabel } from '../utils'

defineProps<{
  employmentTypes: EmploymentTypeOption[]
  categoryOptions: PositionCategoryRef[]
  filteredPositions: PositionListItem[]
}>()

const emit = defineEmits<{
  'category-select': []
}>()

const kategori = defineModel<string>({ required: true })

function onCategorySelect(value: AcceptableValue) {
  kategori.value = typeof value === 'string' ? value : ''
  emit('category-select')
}
</script>

<template>
  <div class="grid gap-5 md:grid-cols-2 p-1">
    <FloatingField
      v-slot="{ componentField }"
      name="nip"
      label="NIP"
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
      name="nuptk"
      label="NUPTK"
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
    <FloatingLabelField
      label="Kategori (filter)"
      for="employee-category-filter"
      floating
      class="content-start"
    >
      <Select
        :model-value="kategori"
        @update:model-value="onCategorySelect"
      >
        <SelectTrigger
          id="employee-category-filter"
          class="w-full"
        >
          <SelectValue placeholder="Semua kategori" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="cat in categoryOptions"
            :key="cat.id"
            :value="cat.id"
          >
            {{ positionCategoryLabel(cat.code, cat.name) }}
          </SelectItem>
        </SelectContent>
      </Select>
    </FloatingLabelField>
    <FloatingField
      v-slot="{ value, handleChange }"
      name="positionId"
      label="Jabatan Utama"
    >
      <div class="content-start">
        <Select
          :model-value="value"
          @update:model-value="handleChange"
        >
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Pilih jabatan..." />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem
              v-for="pos in filteredPositions"
              :key="pos.id"
              :value="pos.id"
            >
              {{ pos.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </FloatingField>
    <FloatingField
      v-slot="{ value, handleChange }"
      name="employmentTypeId"
      label="Status Kepegawaian"
      required
    >
      <div class="content-start">
        <Select
          :model-value="value"
          @update:model-value="handleChange"
        >
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Pilih status saat ini" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem
              v-for="et in employmentTypes"
              :key="et.id"
              :value="et.id"
            >
              {{ et.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </FloatingField>
  </div>
</template>
