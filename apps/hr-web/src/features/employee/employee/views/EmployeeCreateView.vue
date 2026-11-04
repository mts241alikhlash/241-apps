<script setup lang="ts">
import { useRouter } from 'vue-router'
import { BackButton } from '@mts241alikhlash/ui'
import { Check } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Card, CardHeader, CardTitle } from '@mts241alikhlash/ui/card'
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTrigger,
} from '@mts241alikhlash/ui/stepper'
import { AddressFields } from '@/features/shared/multi-step-form'
import { useEmployeeCreateForm } from '../composables/useEmployeeCreateForm'
import EmployeeProfileStep from '../components/create/EmployeeProfileStep.vue'
import EmployeeEmploymentStep from '../components/create/EmployeeEmploymentStep.vue'
import EmployeePositionStep from '../components/create/EmployeePositionStep.vue'
import EmployeeReviewStep from '../components/create/EmployeeReviewStep.vue'

const router = useRouter()

const {
  steps,
  activeStep,
  submitting,
  mobileVisibleStepValues,
  goToStep,
  next,
  back,
  values,
  setFieldValue,
  kategori,
  categoryOptions,
  filteredPositions,
  address,
  hasAddress,
  extraPositions,
  addPosition,
  removePosition,
  employmentTypes,
  positions,
  submit,
} = useEmployeeCreateForm()
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader
        standard
        class="pt-5! pb-5!"
      >
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke daftar pegawai"
            @click="router.push('/staff')"
          />
          <CardTitle size="lg"> Tambah Pegawai Baru </CardTitle>
        </div>
      </CardHeader>

      <div class="px-6 py-4 border-b">
        <Stepper
          :model-value="activeStep"
          class="flex items-center justify-center gap-1 sm:gap-2 w-full max-w-md mx-auto"
          @update:model-value="(v) => void goToStep(Number(v))"
        >
          <StepperItem
            v-for="step in steps"
            :key="step.value"
            :step="step.value"
            class="flex items-center gap-1 sm:gap-2 group transition-all duration-300"
            :class="{
              'hidden sm:flex': !mobileVisibleStepValues.includes(step.value),
            }"
          >
            <StepperTrigger
              class="flex items-center gap-1 sm:gap-2 cursor-pointer outline-none shrink-0"
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
              class="w-3 sm:w-10 h-0.5 bg-muted transition-all duration-300"
              :class="{
                'hidden sm:block': !(
                  mobileVisibleStepValues.includes(step.value) &&
                  mobileVisibleStepValues.includes(step.value + 1)
                ),
              }"
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

      <div class="px-6 py-5">
        <EmployeeProfileStep v-show="activeStep === 1" />

        <EmployeeEmploymentStep
          v-show="activeStep === 2"
          v-model:kategori="kategori"
          :employment-types="employmentTypes"
          :category-options="categoryOptions"
          :filtered-positions="filteredPositions"
          :set-field-value="setFieldValue"
        />

        <div v-if="activeStep === 3">
          <AddressFields v-model="address" />
        </div>

        <EmployeePositionStep
          v-if="activeStep === 4"
          :extra-positions="extraPositions"
          :positions="positions"
          @add-position="addPosition"
          @remove-position="removePosition"
        />

        <EmployeeReviewStep
          v-if="activeStep === 5"
          :values="values"
          :address="address"
          :has-address="hasAddress"
          :extra-positions="extraPositions"
        />
      </div>

      <div
        class="flex items-center justify-between border-t px-6 py-4 bg-background"
      >
        <Button
          variant="outline"
          :disabled="submitting"
          @click="back"
        >
          {{ activeStep === 1 ? 'Batal' : 'Kembali' }}
        </Button>
        <Button
          v-if="activeStep < 5"
          @click="next"
        >
          Lanjut
        </Button>
        <Button
          v-else
          :disabled="submitting"
          @click="submit"
        >
          {{ submitting ? 'Menyimpan...' : 'Simpan Pegawai' }}
        </Button>
      </div>
    </Card>
  </div>
</template>
