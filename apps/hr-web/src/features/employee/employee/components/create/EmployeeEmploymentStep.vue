<script setup lang="ts">
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
import type { EmploymentTypeOption, PositionListItem } from '../../types'
import { positionCategoryLabel } from '../../utils'

defineProps<{
  employmentTypes: EmploymentTypeOption[]
  categoryOptions: { id: string; code: string; name: string }[]
  filteredPositions: PositionListItem[]
  kategori: string
  setFieldValue: (field: string, value: unknown) => void
}>()

const emit = defineEmits<(e: 'update:kategori', value: string) => void>()
</script>

<template>
  <div class="grid gap-5 md:grid-cols-2 items-start">
    <FloatingField
      v-slot="{ componentField }"
      name="nip"
      label="NIP"
    >
      <div>
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
      <div>
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
      name="employmentTypeId"
      label="Status Kepegawaian"
      required
    >
      <div>
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
    <FloatingLabelField
      label="Kategori (filter)"
      floating
      for="employee-create-category-filter"
    >
      <Select
        :model-value="kategori"
        @update:model-value="
          (v) => {
            emit('update:kategori', String(v ?? ''))
            setFieldValue('positionId', '')
          }
        "
      >
        <SelectTrigger
          id="employee-create-category-filter"
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
      <div class="md:col-span-2">
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
  </div>
</template>
