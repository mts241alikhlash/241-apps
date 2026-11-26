<script setup lang="ts">
import { computed, onMounted, useId } from 'vue'
import { AlertCircle, Loader2 } from '@lucide/vue'
import { useRoleGuard } from '@mts241alikhlash/platform/auth'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@mts241alikhlash/ui/form'
import { RadioGroup, RadioGroupItem } from '@mts241alikhlash/ui/radio-group'
import { ASSESSMENT_TYPE_LABELS } from '@/features/assessment/assessment-item/constants/category'
import { isAssessmentType, useRdmSetting } from '../composables/useRdmSetting'

const { can } = useRoleGuard()
const canUpdate = computed(() => can('assessment-settings.update'))

const idPrefix = useId()
const {
  assessmentTypes,
  sumatifTypes,
  sasType,
  loading,
  saving,
  loadError,
  saveError,
  isValid,
  load,
  toggleSumatif,
  setSasType,
  onSubmit,
} = useRdmSetting()

const sasModel = computed<string>({
  get: () => sasType.value ?? '',
  set: (value: string) => {
    if (isAssessmentType(value)) {
      setSasType(value)
    }
  },
})

const canSave = computed(
  () => canUpdate.value && !loading.value && !saving.value && isValid.value,
)

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle size="lg">Pengaturan RDM</CardTitle>
      </CardHeader>

      <CardContent
        variant="standard"
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto"
      >
        <p class="text-control text-muted-foreground">
          Atur jenis penilaian yang dikirim ke template Sumatif dan template SAS
          RDM.
        </p>

        <div
          v-if="loadError"
          role="alert"
          class="space-y-3 rounded-md border p-4"
        >
          <p class="text-control text-destructive">{{ loadError }}</p>
          <Button
            type="button"
            variant="outline"
            @click="load"
          >
            Coba Lagi
          </Button>
        </div>

        <div
          v-else-if="loading"
          class="flex items-center gap-2 text-control text-muted-foreground"
        >
          <Loader2 class="size-4 animate-spin" />
          Memuat pengaturan RDM...
        </div>

        <form
          v-else
          id="rdm-setting-form"
          class="space-y-4"
          @submit.prevent="onSubmit"
        >
          <div class="grid gap-4 md:grid-cols-2">
            <FormField name="sumatifTypes">
              <FormItem class="flex flex-col gap-3 rounded-md border p-4">
                <div class="space-y-1">
                  <h4 class="text-md font-semibold">Template Sumatif</h4>
                  <p class="text-control text-muted-foreground">
                    Pilih satu atau beberapa jenis penilaian untuk dikirim ke
                    template Nilai Sumatif RDM.
                  </p>
                </div>

                <FormControl>
                  <div class="space-y-2">
                    <label
                      v-for="type in assessmentTypes"
                      :key="type"
                      :for="`${idPrefix}-sumatif-${type}`"
                      class="flex items-center gap-3 rounded-md border px-3 py-2 text-control transition-colors"
                      :class="
                        type === sasType || !canUpdate || saving
                          ? 'cursor-not-allowed bg-muted/30 text-muted-foreground opacity-60'
                          : 'cursor-pointer hover:bg-muted/30'
                      "
                    >
                      <Checkbox
                        :id="`${idPrefix}-sumatif-${type}`"
                        :model-value="
                          sumatifTypes.includes(type) && type !== sasType
                        "
                        :disabled="type === sasType || !canUpdate || saving"
                        @update:model-value="
                          toggleSumatif(type, $event === true)
                        "
                      />
                      <span class="min-w-0 flex-1 font-medium">
                        {{ ASSESSMENT_TYPE_LABELS[type] }}
                      </span>
                      <span
                        v-if="type === sasType"
                        class="shrink-0 text-muted-foreground"
                      >
                        Dipakai untuk SAS
                      </span>
                    </label>
                  </div>
                </FormControl>

                <FormMessage />
              </FormItem>
            </FormField>

            <FormField name="sasType">
              <FormItem class="flex flex-col gap-3 rounded-md border p-4">
                <div class="space-y-1">
                  <h4 class="text-md font-semibold">Template SAS</h4>
                  <p class="text-control text-muted-foreground">
                    Pilih satu jenis penilaian untuk dikirim ke template Nilai
                    SAS RDM.
                  </p>
                </div>

                <FormControl>
                  <RadioGroup
                    v-model="sasModel"
                    :disabled="!canUpdate || saving"
                    class="gap-2"
                  >
                    <label
                      v-for="type in assessmentTypes"
                      :key="type"
                      :for="`${idPrefix}-sas-${type}`"
                      class="flex items-center gap-3 rounded-md border px-3 py-2 text-control transition-colors"
                      :class="
                        !canUpdate || saving
                          ? 'cursor-not-allowed bg-muted/30 text-muted-foreground opacity-60'
                          : 'cursor-pointer hover:bg-muted/30 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5'
                      "
                    >
                      <RadioGroupItem
                        :id="`${idPrefix}-sas-${type}`"
                        :value="type"
                        :disabled="!canUpdate || saving"
                      />
                      <span class="min-w-0 flex-1 font-medium">
                        {{ ASSESSMENT_TYPE_LABELS[type] }}
                      </span>
                    </label>
                  </RadioGroup>
                </FormControl>

                <FormMessage />
              </FormItem>
            </FormField>
          </div>

          <Alert
            v-if="saveError"
            variant="destructive"
          >
            <AlertCircle class="size-4" />
            <AlertDescription>{{ saveError }}</AlertDescription>
          </Alert>
        </form>
      </CardContent>

      <CardFooter v-if="canUpdate">
        <Button
          type="submit"
          form="rdm-setting-form"
          :disabled="!canSave"
        >
          <Loader2
            v-if="saving"
            class="size-4 animate-spin"
          />
          {{ saving ? 'Menyimpan...' : 'Simpan Pengaturan' }}
        </Button>
      </CardFooter>
      <CardFooter
        v-else
        plain
      />
    </Card>
  </div>
</template>
