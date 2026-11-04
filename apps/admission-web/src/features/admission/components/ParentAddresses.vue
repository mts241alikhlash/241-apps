<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { Field, useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import { Input } from '@mts241alikhlash/ui/input'
import { FormControl } from '@mts241alikhlash/ui/form'
import FloatingField from './AdmissionField.vue'
import RegionSelect from './RegionSelect.vue'
import { RELATION_LABELS } from '../types'
import {
  addressOwnerOf,
  isGone,
  parentsSchemaFor,
} from '../schemas/applicationFormSchemas'
import { useFormOptions } from '../composables/useFormOptions'
import type {
  ParentForm,
  RegionCodesForm,
} from '../composables/useApplicationFormState'
import { vDigits } from '../vDigits'

defineProps<{
  editable: boolean
}>()

const parents = defineModel<ParentForm[]>({ required: true })
const checkboxId = useId()
const { listOf } = useFormOptions()
const owner = computed(() =>
  addressOwnerOf(parents.value, listOf('parentLifeStatuses')),
)

const { values, errors, validate, setValues } = useForm<{
  parents: ParentForm[]
}>({
  validationSchema: computed(() =>
    toTypedSchema(parentsSchemaFor(listOf('parentLifeStatuses'), 'addresses')),
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

function regionOf(index: number): RegionCodesForm {
  const parent = values.parents?.[index]
  return {
    provinceCode: parent?.provinceCode ?? '',
    regencyCode: parent?.regencyCode ?? '',
    districtCode: parent?.districtCode ?? '',
    villageCode: parent?.villageCode ?? '',
  }
}

const attempted = ref(false)

function validateAll() {
  attempted.value = true
  return validate()
}

function setRegion(index: number, region: RegionCodesForm) {
  setValues(
    {
      parents: (values.parents ?? []).map((parent, at) =>
        at === index ? { ...parent, ...region } : parent,
      ),
    },
    attempted.value,
  )
}

defineExpose({ validate: validateAll })
</script>

<template>
  <div class="space-y-4">
    <template
      v-for="(parent, index) in parents"
      :key="parent.relation"
    >
      <Card
        v-if="
          parent.relation !== owner &&
          !isGone(listOf('parentLifeStatuses'), parent.lifeStatusId)
        "
        gap="none"
        class="overflow-hidden"
      >
        <CardHeader standard>
          <div class="flex items-center gap-3">
            <CardTitle size="md">
              Alamat {{ RELATION_LABELS[parent.relation] }}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent class="grid gap-x-4 gap-y-1 px-4 pb-4 pt-4 sm:grid-cols-2">
          <Field
            v-slot="{ value, handleChange }"
            :name="`parents[${index}].sameAddressAsStudent`"
          >
            <label
              :for="`${checkboxId}-${index}`"
              class="flex min-h-11 items-center gap-3 rounded-md border border-input bg-transparent px-3 py-2 text-[length:var(--text-control,0.75rem)] sm:col-span-2"
              :class="
                editable ? 'cursor-pointer hover:border-primary' : 'opacity-60'
              "
            >
              <Checkbox
                :id="`${checkboxId}-${index}`"
                :model-value="value"
                :disabled="!editable"
                @update:model-value="handleChange"
              />
              Alamat sama dengan alamat
              {{ RELATION_LABELS[owner].toLowerCase() }}
            </label>
          </Field>

          <template v-if="!values.parents?.[index]?.sameAddressAsStudent">
            <FloatingField
              v-slot="{ componentField }"
              :name="`parents[${index}].street`"
              label="Alamat (Jalan)"
              required
              class="sm:col-span-2"
            >
              <FormControl>
                <Input
                  v-bind="componentField"
                  :disabled="!editable"
                />
              </FormControl>
            </FloatingField>

            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
              <FloatingField
                v-slot="{ componentField }"
                :name="`parents[${index}].rt`"
                label="RT"
                required
              >
                <FormControl>
                  <Input
                    v-digits
                    v-bind="componentField"
                    inputmode="numeric"
                    maxlength="3"
                    :disabled="!editable"
                  />
                </FormControl>
              </FloatingField>

              <FloatingField
                v-slot="{ componentField }"
                :name="`parents[${index}].rw`"
                label="RW"
                required
              >
                <FormControl>
                  <Input
                    v-digits
                    v-bind="componentField"
                    inputmode="numeric"
                    maxlength="3"
                    :disabled="!editable"
                  />
                </FormControl>
              </FloatingField>
            </div>

            <FloatingField
              v-slot="{ componentField }"
              :name="`parents[${index}].postalCode`"
              label="Kode Pos"
            >
              <FormControl>
                <Input
                  v-digits
                  v-bind="componentField"
                  inputmode="numeric"
                  maxlength="5"
                  :disabled="!editable"
                />
              </FormControl>
            </FloatingField>

            <div class="sm:col-span-2">
              <RegionSelect
                :model-value="regionOf(index)"
                :disabled="!editable"
                :invalid="
                  attempted && !!errors[`parents[${index}].villageCode`]
                "
                @update:model-value="setRegion(index, $event)"
              />
            </div>
          </template>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
