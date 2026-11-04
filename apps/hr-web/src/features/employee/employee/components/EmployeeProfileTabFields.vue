<script setup lang="ts">
import { DatePicker } from '@mts241alikhlash/ui'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { FormControl, FloatingField } from '@mts241alikhlash/ui/form'
import { vDigits } from '../vDigits'
</script>

<template>
  <div class="grid gap-5 md:grid-cols-2 p-1">
    <FloatingField
      v-slot="{ componentField }"
      name="name"
      label="Nama Lengkap"
      required
    >
      <div class="md:col-span-2 content-start">
        <FormControl>
          <Input
            maxlength="100"
            v-bind="componentField"
          />
        </FormControl>
      </div>
    </FloatingField>
    <FloatingField
      v-slot="{ componentField }"
      name="nik"
      label="NIK (16 digit)"
      required
    >
      <div class="content-start">
        <FormControl>
          <Input
            v-digits
            maxlength="16"
            inputmode="numeric"
            v-bind="componentField"
          />
        </FormControl>
      </div>
    </FloatingField>
    <FloatingField
      v-slot="{ value, handleChange }"
      name="gender"
      label="Jenis Kelamin"
      required
    >
      <div class="content-start">
        <Select
          :model-value="value"
          @update:model-value="handleChange"
        >
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Pilih jenis kelamin" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="MALE"> Laki-laki </SelectItem>
            <SelectItem value="FEMALE"> Perempuan </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </FloatingField>
    <FloatingField
      v-slot="{ componentField }"
      name="birthPlace"
      label="Tempat Lahir"
      required
    >
      <div class="content-start">
        <FormControl>
          <Input
            maxlength="100"
            v-bind="componentField"
          />
        </FormControl>
      </div>
    </FloatingField>
    <FloatingField
      v-slot="{ value, handleChange }"
      name="birthDate"
      label="Tanggal Lahir"
      required
      always-float
    >
      <div class="content-start">
        <FormControl>
          <DatePicker
            :model-value="value"
            placeholder="Pilih tanggal lahir"
            @update:model-value="handleChange"
          />
        </FormControl>
      </div>
    </FloatingField>
    <FloatingField
      v-slot="{ componentField }"
      name="email"
      label="Email"
    >
      <div class="content-start">
        <FormControl>
          <Input
            type="email"
            maxlength="255"
            v-bind="componentField"
          />
        </FormControl>
      </div>
    </FloatingField>
    <FloatingField
      v-slot="{ componentField }"
      name="phone"
      label="No. HP"
    >
      <div class="content-start">
        <FormControl>
          <Input
            maxlength="15"
            v-bind="componentField"
          />
        </FormControl>
      </div>
    </FloatingField>
  </div>
</template>
