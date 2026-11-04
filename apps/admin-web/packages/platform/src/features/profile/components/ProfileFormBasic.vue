<script setup lang="ts">
import { DatePicker } from '@mts241alikhlash/ui'
import { FloatingField, FormControl } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import type { FormContext } from 'vee-validate'

defineProps<{
  form: FormContext
}>()
</script>

<template>
  <div class="grid gap-x-4 gap-y-2 md:grid-cols-2 p-1">
    <FloatingField
      v-slot="{ componentField }"
      name="name"
      label="Nama Lengkap"
      required
      class="md:col-span-2"
    >
      <FormControl>
        <Input
          maxlength="100"
          v-bind="componentField"
        />
      </FormControl>
    </FloatingField>
    <FloatingField
      v-slot="{ componentField }"
      name="nik"
      label="NIK"
      required
    >
      <FormControl>
        <Input
          maxlength="16"
          v-bind="componentField"
        />
      </FormControl>
    </FloatingField>
    <FloatingField
      v-slot="{ value, handleChange }"
      name="gender"
      label="Jenis Kelamin"
      required
    >
      <Select
        :model-value="value"
        @update:model-value="handleChange"
      >
        <FormControl>
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="MALE"> Laki-laki </SelectItem>
          <SelectItem value="FEMALE"> Perempuan </SelectItem>
        </SelectContent>
      </Select>
    </FloatingField>
    <FloatingField
      v-slot="{ componentField }"
      name="birthPlace"
      label="Tempat Lahir"
      required
    >
      <FormControl>
        <Input
          maxlength="100"
          v-bind="componentField"
        />
      </FormControl>
    </FloatingField>
    <FloatingField
      v-slot="{ value, setValue }"
      name="birthDate"
      label="Tanggal Lahir"
      required
      always-float
    >
      <FormControl>
        <DatePicker
          :model-value="value"
          placeholder=""
          @update:model-value="setValue"
        />
      </FormControl>
    </FloatingField>
  </div>
</template>
