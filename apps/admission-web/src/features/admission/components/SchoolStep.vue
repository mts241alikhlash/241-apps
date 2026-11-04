<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { Input } from '@mts241alikhlash/ui/input'
import { FormControl } from '@mts241alikhlash/ui/form'
import FloatingField from './AdmissionField.vue'
import { schoolSchema } from '../schemas/applicationFormSchemas'
import type { SchoolForm } from '../composables/useApplicationFormState'
import { vDigits } from '../vDigits'

defineProps<{
  editable: boolean
}>()

const model = defineModel<SchoolForm>({ required: true })

const { values, validate, setValues } = useForm<SchoolForm>({
  validationSchema: toTypedSchema(schoolSchema),
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
      name="previousSchoolName"
      label="Nama Sekolah Asal"
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
      name="previousSchoolNpsn"
      label="NPSN"
    >
      <FormControl>
        <Input
          v-digits
          v-bind="componentField"
          inputmode="numeric"
          maxlength="8"
          :disabled="!editable"
        />
      </FormControl>
    </FloatingField>

    <FloatingField
      v-slot="{ componentField }"
      name="previousSchoolAddress"
      label="Alamat Sekolah"
      class="sm:col-span-2"
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
      name="graduationYear"
      label="Tahun Lulus"
      required
    >
      <FormControl>
        <Input
          v-digits
          v-bind="componentField"
          inputmode="numeric"
          maxlength="4"
          :disabled="!editable"
        />
      </FormControl>
    </FloatingField>
  </div>
</template>
