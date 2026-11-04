<script setup lang="ts">
import { watch, ref, onMounted } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { statusOptions } from '../constants'
import { schoolUnitTypeApi } from '@/features/platform/school-unit-type'
import type { SchoolUnitProfile } from '../types'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { FormControl, FloatingField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'

const props = defineProps<{
  draftSchoolUnit: SchoolUnitProfile
  formError: string | null
  isSaving: boolean
}>()

const emit = defineEmits<{
  save: []
  cancel: []
  'update:draftSchoolUnit': [value: SchoolUnitProfile]
}>()

const typeOptions = ref<{ value: string; label: string }[]>([])

onMounted(async () => {
  try {
    const res = await schoolUnitTypeApi.getSchoolUnitTypes({ limit: 100 })
    const activeTypes = res.data.data?.filter((t) => t.isActive) ?? []
    typeOptions.value = activeTypes.map((t) => ({
      value: t.id,
      label: t.name,
    }))
  } catch (error) {
    console.error('Gagal memuat tipe unit sekolah:', error)
  }
})

const formSchema = toTypedSchema(
  z.object({
    name: z.string().min(1, 'Nama lembaga wajib diisi.'),
    surname: z.string().min(1, 'Nama singkat wajib diisi.'),
    nsm: z.string().min(1, 'NSM wajib diisi.'),
    npsn: z.string().min(1, 'NPSN wajib diisi.'),
    status: z.enum(['PUBLIC', 'PRIVATE'], {
      required_error: 'Status wajib dipilih.',
    }),
    typeId: z.string().min(1, 'Tipe wajib dipilih.'),
    npwp: z.string().min(1, 'NPWP wajib diisi.'),
    phone: z.string().min(1, 'Telepon wajib diisi.'),
    email: z
      .string()
      .email('Format email tidak valid.')
      .min(1, 'Email wajib diisi.'),
    website: z.string().min(1, 'Website wajib diisi.'),
  }),
)

const form = useForm({
  validationSchema: formSchema,
  initialValues: {
    name: '',
    surname: '',
    nsm: '',
    npsn: '',
    status: undefined,
    typeId: undefined,
    npwp: '',
    phone: '',
    email: '',
    website: '',
  },
})

watch(
  () => props.draftSchoolUnit,
  (newVal) => {
    form.resetForm({
      values: {
        name: newVal.name ?? '',
        surname: newVal.surname ?? '',
        nsm: newVal.nsm ?? '',
        npsn: newVal.npsn ?? '',
        status: newVal.status ?? undefined,
        typeId: newVal.typeId ?? undefined,
        npwp: newVal.npwp ?? '',
        phone: newVal.phone ?? '',
        email: newVal.email ?? '',
        website: newVal.website ?? '',
      },
    })
  },
  { immediate: true, deep: true },
)

const onSave = form.handleSubmit((values) => {
  emit('update:draftSchoolUnit', values)
  emit('save')
})
</script>

<template>
  <div>
    <div class="px-6 pt-3 pb-6">
      <div class="grid gap-4 md:grid-cols-2">
        <FloatingField
          v-slot="{ componentField }"
          name="name"
          label="Nama Lembaga"
          required
        >
          <div class="content-start">
            <FormControl>
              <Input v-bind="componentField" />
            </FormControl>
          </div>
        </FloatingField>

        <FloatingField
          v-slot="{ componentField }"
          name="surname"
          label="Nama Singkat"
          required
        >
          <div class="content-start">
            <FormControl>
              <Input v-bind="componentField" />
            </FormControl>
          </div>
        </FloatingField>

        <FloatingField
          v-slot="{ componentField }"
          name="nsm"
          label="NSM"
          required
        >
          <div class="content-start">
            <FormControl>
              <Input v-bind="componentField" />
            </FormControl>
          </div>
        </FloatingField>

        <FloatingField
          v-slot="{ componentField }"
          name="npsn"
          label="NPSN"
          required
        >
          <div class="content-start">
            <FormControl>
              <Input v-bind="componentField" />
            </FormControl>
          </div>
        </FloatingField>

        <FloatingField
          v-slot="{ value, handleChange }"
          name="status"
          label="Status"
          required
        >
          <div class="content-start">
            <Select
              :model-value="value"
              @update:model-value="handleChange"
            >
              <FormControl>
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem
                  v-for="option in statusOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FloatingField>

        <FloatingField
          v-slot="{ value, handleChange }"
          name="typeId"
          label="Tipe"
          required
        >
          <div class="content-start">
            <Select
              :model-value="value"
              :disabled="Boolean(props.draftSchoolUnit.id)"
              @update:model-value="handleChange"
            >
              <FormControl>
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Pilih tipe unit sekolah" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem
                  v-for="option in typeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FloatingField>

        <FloatingField
          v-slot="{ componentField }"
          name="npwp"
          label="NPWP"
          required
        >
          <div class="content-start">
            <FormControl>
              <Input v-bind="componentField" />
            </FormControl>
          </div>
        </FloatingField>

        <FloatingField
          v-slot="{ componentField }"
          name="phone"
          label="Telepon"
          required
        >
          <div class="content-start">
            <FormControl>
              <Input v-bind="componentField" />
            </FormControl>
          </div>
        </FloatingField>

        <FloatingField
          v-slot="{ componentField }"
          name="email"
          label="Email"
          required
        >
          <div class="content-start">
            <FormControl>
              <Input v-bind="componentField" />
            </FormControl>
          </div>
        </FloatingField>

        <FloatingField
          v-slot="{ componentField }"
          name="website"
          label="Website"
          required
        >
          <div class="content-start">
            <FormControl>
              <Input v-bind="componentField" />
            </FormControl>
          </div>
        </FloatingField>
      </div>

      <p
        v-if="formError"
        class="text-sm font-medium text-destructive mt-4"
      >
        {{ formError }}
      </p>
    </div>

    <div
      class="px-6 py-4 border-t bg-muted/20 shrink-0 flex items-center justify-end gap-2"
    >
      <Button
        type="button"
        variant="outline"
        @click="emit('cancel')"
      >
        Batal
      </Button>
      <Button
        type="button"
        variant="default"
        :disabled="isSaving"
        @click="onSave"
      >
        <div
          v-if="isSaving"
          class="size-4 mr-2 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin"
        />
        {{ isSaving ? 'Menyimpan...' : 'Simpan & Lanjutkan' }}
      </Button>
    </div>
  </div>
</template>
