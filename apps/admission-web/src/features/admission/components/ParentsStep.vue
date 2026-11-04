<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { Badge } from '@mts241alikhlash/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Input } from '@mts241alikhlash/ui/input'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@mts241alikhlash/ui/form'
import FloatingField from './AdmissionField.vue'
import { DatePicker } from '@mts241alikhlash/ui'
import { RELATION_LABELS } from '../types'
import {
  isAlive,
  isGone,
  parentsSchemaFor,
} from '../schemas/applicationFormSchemas'
import { useFormOptions } from '../composables/useFormOptions'
import type { ParentForm } from '../composables/useApplicationFormState'
import type { ParentRelation } from '../types'
import OptionSelect from './OptionSelect.vue'
import { vDigits } from '../vDigits'

const props = defineProps<{
  editable: boolean
  guardianRelation: ParentRelation
  onChooseGuardian: (relation: ParentRelation) => void
}>()

const parents = defineModel<ParentForm[]>({ required: true })

const { listOf } = useFormOptions()

const { values, validate, setValues } = useForm<{ parents: ParentForm[] }>({
  validationSchema: computed(() =>
    toTypedSchema(parentsSchemaFor(listOf('parentLifeStatuses'))),
  ),
  initialValues: { parents: parents.value },
})

watch(parents, (v) => setValues({ parents: v }, false))
watch(
  values,
  (v) => {
    if (v.parents) parents.value.splice(0, parents.value.length, ...v.parents)
  },
  { deep: true },
)

const GUARDIAN_CHOICES = [
  { id: 'FATHER', name: 'Sama dengan ayah' },
  { id: 'MOTHER', name: 'Sama dengan ibu' },
  { id: 'GUARDIAN', name: 'Orang lain' },
]

const fifteenYearsAgo = (() => {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 15)
  return date.toISOString().slice(0, 10)
})()

function gone(parent: ParentForm) {
  return isGone(listOf('parentLifeStatuses'), parent.lifeStatusId)
}

function nikRequired(parent: ParentForm) {
  return (
    parent.isPrimary ||
    (parent.relation !== 'GUARDIAN' &&
      isAlive(listOf('parentLifeStatuses'), parent.lifeStatusId))
  )
}

function nameRequired(parent: ParentForm) {
  return !(
    parent.relation !== 'GUARDIAN' &&
    listOf('parentLifeStatuses').find((s) => s.id === parent.lifeStatusId)
      ?.name === 'Tidak diketahui'
  )
}

function chooseGuardian(relation: ParentRelation) {
  props.onChooseGuardian(relation)
}

defineExpose({ validate })
</script>

<template>
  <div class="space-y-4">
    <template
      v-for="(parent, index) in parents"
      :key="parent.relation"
    >
      <Card
        gap="none"
        class="overflow-hidden"
      >
        <CardHeader
          standard
          class="flex-wrap"
        >
          <CardTitle
            size="md"
            class="flex flex-wrap items-center gap-2"
          >
            {{
              parent.relation === 'GUARDIAN'
                ? 'Wali santri'
                : `${RELATION_LABELS[parent.relation]} Kandung`
            }}
            <Badge
              v-if="parent.isPrimary && parent.relation === 'MOTHER'"
              variant="secondary"
            >
              Wali
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent
          class="grid gap-x-4 gap-y-1 px-4 pb-4 sm:grid-cols-2"
          :class="parent.relation === 'GUARDIAN' ? 'pt-5' : ''"
        >
          <div
            v-if="parent.relation === 'GUARDIAN'"
            class="sm:col-span-2"
          >
            <OptionSelect
              label="Wali santri"
              :model-value="guardianRelation"
              :options="GUARDIAN_CHOICES"
              :disabled="!editable"
              @update:model-value="chooseGuardian($event as ParentRelation)"
            />
          </div>
          <FloatingField
            v-slot="{ componentField }"
            :name="`parents[${index}].name`"
            label="Nama Lengkap"
            :required="nameRequired(parent)"
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
            :name="`parents[${index}].nik`"
            label="NIK"
            :required="nikRequired(parent)"
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
            :name="`parents[${index}].birthPlace`"
            label="Tempat Lahir"
            :required="parent.isPrimary"
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
            :name="`parents[${index}].birthDate`"
            label="Tanggal Lahir"
            :required="parent.isPrimary"
            always-float
            class="[&_button]:border-input [&_button]:bg-transparent [&_button:hover]:bg-transparent [&_button:hover]:text-foreground dark:[&_button]:bg-input/30 dark:[&_button:hover]:bg-input/30"
          >
            <FormControl>
              <div class="birth-date-picker">
                <DatePicker
                  :model-value="value ?? ''"
                  min-date="1940-01-01"
                  :max-date="fifteenYearsAgo"
                  placeholder=""
                  :disabled="!editable"
                  @update:model-value="setValue"
                />
              </div>
            </FormControl>
          </FloatingField>

          <FloatingField
            v-if="!gone(parent)"
            v-slot="{ componentField }"
            :name="`parents[${index}].phone`"
            label="No. HP"
            :required="parent.isPrimary"
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
            v-if="parent.relation !== 'GUARDIAN'"
            v-slot="{ value, handleChange, errorMessage }"
            :name="`parents[${index}].lifeStatusId`"
            label="Status"
            required
          >
            <OptionSelect
              :label="`${RELATION_LABELS[parent.relation]}: Status`"
              :model-value="value"
              :options="listOf('parentLifeStatuses')"
              :invalid="!!errorMessage"
              :disabled="!editable"
              @update:model-value="handleChange"
            />
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            :name="`parents[${index}].educationId`"
            label="Pendidikan"
          >
            <OptionSelect
              :label="`${RELATION_LABELS[parent.relation]}: Pendidikan`"
              :model-value="value"
              :options="listOf('educations')"
              :disabled="!editable"
              @update:model-value="handleChange"
            />
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange, errorMessage }"
            :name="`parents[${index}].occupationId`"
            label="Pekerjaan"
            :required="parent.isPrimary"
          >
            <OptionSelect
              :label="`${RELATION_LABELS[parent.relation]}: Pekerjaan`"
              :model-value="value"
              :options="listOf('occupations')"
              :invalid="!!errorMessage"
              :disabled="!editable"
              @update:model-value="handleChange"
            />
          </FloatingField>

          <FloatingField
            v-if="!gone(parent)"
            v-slot="{ value, handleChange }"
            :name="`parents[${index}].incomeRangeId`"
            label="Penghasilan"
          >
            <OptionSelect
              :label="`${RELATION_LABELS[parent.relation]}: Penghasilan`"
              :model-value="value"
              :options="listOf('incomeRanges')"
              :disabled="!editable"
              @update:model-value="handleChange"
            />
          </FloatingField>

          <FloatingField
            v-if="!gone(parent)"
            v-slot="{ value, handleChange }"
            :name="`parents[${index}].domicileId`"
            label="Domisili"
          >
            <OptionSelect
              :label="`${RELATION_LABELS[parent.relation]}: Domisili`"
              :model-value="value"
              :options="listOf('domiciles')"
              :disabled="!editable"
              @update:model-value="handleChange"
            />
          </FloatingField>

          <FloatingField
            v-if="!gone(parent)"
            v-slot="{ value, handleChange }"
            :name="`parents[${index}].residenceId`"
            label="Status Tempat Tinggal"
          >
            <OptionSelect
              :label="`${RELATION_LABELS[parent.relation]}: Status Tempat Tinggal`"
              :model-value="value"
              :options="listOf('parentResidences')"
              :disabled="!editable"
              @update:model-value="handleChange"
            />
          </FloatingField>
        </CardContent>
      </Card>

      <Card
        v-if="parent.relation === 'MOTHER' && guardianRelation !== 'GUARDIAN'"
        gap="none"
        class="overflow-hidden"
      >
        <CardHeader
          standard
          class="flex-wrap"
        >
          <CardTitle
            size="md"
            class="flex flex-wrap items-center gap-2"
          >
            Wali santri
          </CardTitle>
        </CardHeader>
        <CardContent class="px-4 pt-5 pb-4">
          <OptionSelect
            label="Wali santri"
            :model-value="guardianRelation"
            :options="GUARDIAN_CHOICES"
            :disabled="!editable"
            @update:model-value="chooseGuardian($event as ParentRelation)"
          />
        </CardContent>
      </Card>
    </template>

    <FormField name="parents">
      <FormItem>
        <FormMessage />
      </FormItem>
    </FormField>
  </div>
</template>
