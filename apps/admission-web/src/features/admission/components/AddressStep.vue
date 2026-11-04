<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { FormControl } from '@mts241alikhlash/ui/form'
import FloatingField from './AdmissionField.vue'
import {
  addressOwnerOf,
  addressSchema,
} from '../schemas/applicationFormSchemas'
import { useFormOptions } from '../composables/useFormOptions'
import type {
  AddressForm,
  ParentForm,
  RegionCodesForm,
} from '../composables/useApplicationFormState'
import OptionSelect from './OptionSelect.vue'
import RegionSelect from './RegionSelect.vue'
import ParentAddresses from './ParentAddresses.vue'
import { RELATION_LABELS } from '../types'
import { vDigits } from '../vDigits'

defineProps<{
  editable: boolean
}>()

const model = defineModel<AddressForm>({ required: true })
const parents = defineModel<ParentForm[]>('parents', { required: true })
const addressOwner = computed(
  () =>
    RELATION_LABELS[
      addressOwnerOf(parents.value, listOf('parentLifeStatuses'))
    ],
)
const parentAddressesRef = ref<{
  validate: () => Promise<{ valid: boolean }>
} | null>(null)

const { listOf } = useFormOptions()

const { values, errors, validate, setValues } = useForm<AddressForm>({
  validationSchema: toTypedSchema(addressSchema),
  initialValues: model.value,
})

watch(model, (v) => setValues(v, false))
watch(values, (v) => Object.assign(model.value, v), { deep: true })

function regionOf(): RegionCodesForm {
  return {
    provinceCode: values.provinceCode ?? '',
    regencyCode: values.regencyCode ?? '',
    districtCode: values.districtCode ?? '',
    villageCode: values.villageCode ?? '',
  }
}

const attempted = ref(false)

async function validateAll() {
  attempted.value = true
  const [own, others] = await Promise.all([
    validate(),
    parentAddressesRef.value?.validate() ?? Promise.resolve({ valid: true }),
  ])
  return { valid: own.valid && others.valid }
}

defineExpose({ validate: validateAll })
</script>

<template>
  <div class="space-y-6">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex items-center gap-3">
          <CardTitle size="md"> Alamat {{ addressOwner }} </CardTitle>
        </div>
      </CardHeader>
      <CardContent class="grid gap-x-4 gap-y-1 px-4 pt-4 pb-4 sm:grid-cols-2">
        <FloatingField
          v-slot="{ componentField }"
          name="street"
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
            name="rt"
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
            name="rw"
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
          name="postalCode"
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
            :model-value="regionOf()"
            :disabled="!editable"
            :invalid="attempted && !!errors.villageCode"
            @update:model-value="setValues($event, attempted)"
          />
        </div>

        <FloatingField
          v-slot="{ value, handleChange, errorMessage }"
          name="studentResidenceId"
          label="Status Tempat Tinggal"
          required
        >
          <OptionSelect
            :invalid="!!errorMessage"
            label="Status Tempat Tinggal"
            :model-value="value"
            :options="listOf('studentResidences')"
            :disabled="!editable"
            @update:model-value="handleChange"
          />
        </FloatingField>

        <FloatingField
          v-slot="{ value, handleChange, errorMessage }"
          name="transportationId"
          label="Transportasi ke Madrasah"
          required
        >
          <OptionSelect
            :invalid="!!errorMessage"
            label="Transportasi ke Madrasah"
            :model-value="value"
            :options="listOf('transportations')"
            :disabled="!editable"
            @update:model-value="handleChange"
          />
        </FloatingField>

        <FloatingField
          v-slot="{ value, handleChange, errorMessage }"
          name="travelDistanceId"
          label="Jarak Tempat Tinggal ke Madrasah"
          required
        >
          <OptionSelect
            :invalid="!!errorMessage"
            label="Jarak Tempat Tinggal ke Madrasah"
            :model-value="value"
            :options="listOf('travelDistances')"
            :disabled="!editable"
            @update:model-value="handleChange"
          />
        </FloatingField>

        <FloatingField
          v-slot="{ value, handleChange, errorMessage }"
          name="travelTimeId"
          label="Waktu Tempuh ke Madrasah"
          required
        >
          <OptionSelect
            :invalid="!!errorMessage"
            label="Waktu Tempuh ke Madrasah"
            :model-value="value"
            :options="listOf('travelTimes')"
            :disabled="!editable"
            @update:model-value="handleChange"
          />
        </FloatingField>
      </CardContent>
    </Card>
    <ParentAddresses
      ref="parentAddressesRef"
      v-model="parents"
      :editable="editable"
    />
  </div>
</template>
