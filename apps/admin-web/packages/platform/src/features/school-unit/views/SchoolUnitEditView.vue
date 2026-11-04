<script setup lang="ts">
import { BackButton } from '@mts241alikhlash/ui'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Card, CardHeader, CardTitle } from '@mts241alikhlash/ui/card'
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTrigger,
} from '@mts241alikhlash/ui/stepper'
import { Check } from '@lucide/vue'
import SchoolUnitAddressForm from '../components/SchoolUnitAddressForm.vue'
import SchoolUnitInfoForm from '../components/SchoolUnitInfoForm.vue'
import { useSchoolUnit } from '../composables/useSchoolUnit'

const router = useRouter()
const activeStep = ref(1)

const steps = [
  {
    value: 1,
    title: 'Informasi Lembaga',
  },
  {
    value: 2,
    title: 'Lokasi Lembaga',
  },
]

const {
  draftSchoolUnit,
  draftAddress,
  schoolUnitFormError,
  addressFormError,
  isSavingSchoolUnit,
  isSavingAddress,
  loadSchoolUnitData,
  initializeEditForm,
  saveSchoolUnitInfo,
  saveAddressInfo,
} = useSchoolUnit()

onMounted(async () => {
  await loadSchoolUnitData()
  initializeEditForm()
})

const handleSaveSchoolUnit = async () => {
  await saveSchoolUnitInfo()
  if (!schoolUnitFormError.value) {
    activeStep.value = 2
  }
}

const handleSaveAddress = async () => {
  await saveAddressInfo()
  if (!addressFormError.value) {
    void router.push('/school-unit')
  }
}
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke profil sekolah"
            @click="router.push('/school-unit')"
          />
          <CardTitle size="lg"> Ubah Profil Sekolah </CardTitle>
        </div>
      </CardHeader>

      <div class="w-full">
        <div class="px-6 py-3 border-b">
          <Stepper
            v-model="activeStep"
            class="flex items-center justify-center gap-2 w-full max-w-md mx-auto"
          >
            <StepperItem
              v-for="step in steps"
              :key="step.value"
              :step="step.value"
              class="flex items-center gap-2 group"
            >
              <StepperTrigger
                class="flex items-center gap-3 cursor-pointer outline-none shrink-0"
              >
                <StepperIndicator class="shrink-0">
                  <Check
                    v-if="activeStep > step.value"
                    class="size-4"
                  />
                  <span v-else>{{ step.value }}</span>
                </StepperIndicator>
              </StepperTrigger>
              <StepperSeparator
                v-if="step.value < steps.length"
                class="w-6 sm:w-10 h-0.5 bg-muted"
              />
            </StepperItem>
          </Stepper>

          <div class="mt-3 text-center">
            <span
              class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Langkah {{ activeStep }} dari {{ steps.length }}
            </span>
            <p class="text-sm font-bold text-foreground">
              {{ steps.find((s) => s.value === activeStep)?.title }}
            </p>
          </div>
        </div>

        <div
          v-if="activeStep === 1"
          class="mt-0 border-0 outline-none"
        >
          <SchoolUnitInfoForm
            :draft-school-unit="draftSchoolUnit"
            :form-error="schoolUnitFormError"
            :is-saving="isSavingSchoolUnit"
            @cancel="router.push('/school-unit')"
            @save="handleSaveSchoolUnit"
            @update:draft-school-unit="
              (val) => Object.assign(draftSchoolUnit, val)
            "
          />
        </div>

        <div
          v-if="activeStep === 2"
          class="mt-0 border-0 outline-none"
        >
          <SchoolUnitAddressForm
            :draft-address="draftAddress"
            :form-error="addressFormError"
            :is-saving="isSavingAddress"
            @cancel="activeStep = 1"
            @save="handleSaveAddress"
            @update:draft-address="(val) => Object.assign(draftAddress, val)"
          />
        </div>
      </div>
    </Card>
  </div>
</template>
