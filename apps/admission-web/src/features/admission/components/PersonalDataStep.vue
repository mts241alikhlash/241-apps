<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { FormControl } from '@mts241alikhlash/ui/form'
import FloatingField from './AdmissionField.vue'
import { DatePicker, FormattedNumberInput } from '@mts241alikhlash/ui'
import { personalSchema } from '../schemas/applicationFormSchemas'
import { useFormOptions } from '../composables/useFormOptions'
import OptionSelect from './OptionSelect.vue'
import type { PersonalForm } from '../composables/useApplicationFormState'
import { vDigits } from '../vDigits'

defineProps<{
  editable: boolean
}>()

const model = defineModel<PersonalForm>({ required: true })

const { listOf } = useFormOptions()

const { values, validate, setValues } = useForm<PersonalForm>({
  validationSchema: toTypedSchema(personalSchema),
  initialValues: model.value,
})

watch(model, (v) => setValues(v, false))
watch(values, (v) => Object.assign(model.value, v), { deep: true })

defineExpose({ validate })
</script>

<template>
  <div class="grid gap-x-4 gap-y-1 sm:grid-cols-2">
    <FloatingField
      v-slot="{ componentField }"
      name="fullName"
      label="Nama Lengkap"
      required
    >
      <FormControl>
        <Input
          v-bind="componentField"
          :disabled="!editable"
        />
      </FormControl>
    </FloatingField>

    <FloatingField
      v-slot="{ componentField }"
      name="nickname"
      label="Nama Panggilan"
    >
      <FormControl>
        <Input
          v-bind="componentField"
          :disabled="!editable"
        />
      </FormControl>
    </FloatingField>

    <FloatingField
      v-slot="{ componentField }"
      name="birthPlace"
      label="Tempat Lahir"
      required
    >
      <FormControl>
        <Input
          v-bind="componentField"
          :disabled="!editable"
        />
      </FormControl>
    </FloatingField>

    <FloatingField
      v-slot="{ value, setValue }"
      name="birthDate"
      label="Tanggal Lahir"
      required
      always-float
      class="[&_button]:border-input [&_button]:bg-transparent [&_button:hover]:bg-transparent [&_button:hover]:text-foreground dark:[&_button]:bg-input/30 dark:[&_button:hover]:bg-input/30"
    >
      <FormControl>
        <div class="birth-date-picker">
          <DatePicker
            :model-value="value ?? ''"
            min-date="2000-01-01"
            placeholder=""
            :disabled="!editable"
            @update:model-value="setValue"
          />
        </div>
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
          v-digits
          v-bind="componentField"
          inputmode="numeric"
          maxlength="16"
          :disabled="!editable"
        />
      </FormControl>
    </FloatingField>

    <FloatingField
      v-slot="{ componentField }"
      name="nisn"
      label="NISN"
    >
      <FormControl>
        <Input
          v-digits
          v-bind="componentField"
          inputmode="numeric"
          maxlength="10"
          :disabled="!editable"
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
        :disabled="!editable"
        @update:model-value="handleChange"
      >
        <FormControl>
          <SelectTrigger
            class="w-full aria-invalid:data-[placeholder]:text-destructive"
          >
            <SelectValue />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="MALE">Laki-laki</SelectItem>
          <SelectItem value="FEMALE">Perempuan</SelectItem>
        </SelectContent>
      </Select>
    </FloatingField>

    <FloatingField
      v-slot="{ value, handleChange, errorMessage }"
      name="religionId"
      label="Agama"
      required
    >
      <OptionSelect
        label="Agama"
        :model-value="value"
        :options="listOf('religions')"
        :invalid="!!errorMessage"
        :disabled="!editable"
        @update:model-value="handleChange"
      />
    </FloatingField>

    <FloatingField
      v-slot="{ componentField }"
      name="childOrder"
      label="Anak ke-"
    >
      <FormControl>
        <Input
          v-digits
          v-bind="componentField"
          inputmode="numeric"
          maxlength="2"
          :disabled="!editable"
        />
      </FormControl>
    </FloatingField>

    <FloatingField
      v-slot="{ value, setValue }"
      name="siblingCount"
      label="Jumlah Saudara"
    >
      <FormControl>
        <FormattedNumberInput
          name="siblingCount"
          :model-value="value"
          suffix=" orang"
          :max-digits="2"
          :disabled="!editable"
          @update:model-value="setValue"
        />
      </FormControl>
    </FloatingField>

    <FloatingField
      v-slot="{ componentField }"
      name="phone"
      label="No. HP"
    >
      <FormControl>
        <Input
          v-digits.phone
          v-bind="componentField"
          inputmode="tel"
          maxlength="20"
          :disabled="!editable"
        />
      </FormControl>
    </FloatingField>

    <FloatingField
      v-slot="{ componentField }"
      name="hobby"
      label="Hobi"
    >
      <FormControl>
        <Input
          v-bind="componentField"
          :disabled="!editable"
        />
      </FormControl>
    </FloatingField>

    <FloatingField
      v-slot="{ componentField }"
      name="aspiration"
      label="Cita-cita"
    >
      <FormControl>
        <Input
          v-bind="componentField"
          :disabled="!editable"
        />
      </FormControl>
    </FloatingField>

    <FloatingField
      v-slot="{ value, handleChange, errorMessage }"
      name="financingSourceId"
      label="Yang Membiayai Sekolah"
      required
    >
      <OptionSelect
        label="Yang Membiayai Sekolah"
        :model-value="value"
        :options="listOf('financingSources')"
        :invalid="!!errorMessage"
        :disabled="!editable"
        @update:model-value="handleChange"
      />
    </FloatingField>

    <FloatingField
      v-slot="{ value, handleChange }"
      name="disabilityTypeId"
      label="Kebutuhan Disabilitas"
    >
      <OptionSelect
        label="Kebutuhan Disabilitas"
        :model-value="value"
        :options="listOf('disabilityTypes')"
        :disabled="!editable"
        @update:model-value="handleChange"
      />
    </FloatingField>

    <FloatingField
      v-slot="{ value, handleChange }"
      name="specialNeedId"
      label="Kebutuhan Khusus"
    >
      <OptionSelect
        label="Kebutuhan Khusus"
        :model-value="value"
        :options="listOf('specialNeeds')"
        :disabled="!editable"
        @update:model-value="handleChange"
      />
    </FloatingField>
  </div>
</template>
