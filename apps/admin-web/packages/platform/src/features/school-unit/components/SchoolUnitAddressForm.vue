<script setup lang="ts">
import { watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import type { SchoolUnitAddress } from '../types'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { FormControl, FloatingField } from '@mts241alikhlash/ui/form'

const props = defineProps<{
  draftAddress: SchoolUnitAddress
  formError: string | null
  isSaving: boolean
}>()

const emit = defineEmits<{
  save: []
  cancel: []
  'update:draftAddress': [value: SchoolUnitAddress]
}>()

const coordinate = (label: string, bound: number) =>
  z.preprocess(
    (value) =>
      value === '' || value === null || value === undefined
        ? null
        : Number(value),
    z
      .number({ invalid_type_error: `${label} harus berupa angka.` })
      .min(-bound, `${label} minimal -${bound}.`)
      .max(bound, `${label} maksimal ${bound}.`)
      .nullable(),
  )

const formSchema = toTypedSchema(
  z
    .object({
      street: z.string().min(1, 'Alamat wajib diisi.'),
      rt: z.string().max(5, 'RT maksimal 5 karakter.').optional().default(''),
      rw: z.string().max(5, 'RW maksimal 5 karakter.').optional().default(''),
      village: z.string().min(1, 'Kelurahan / Desa wajib diisi.'),
      district: z.string().min(1, 'Kecamatan wajib diisi.'),
      city: z.string().min(1, 'Kota / Kabupaten wajib diisi.'),
      province: z.string().min(1, 'Provinsi wajib diisi.'),
      country: z.string().min(1, 'Negara wajib diisi.'),
      postalCode: z.string().min(1, 'Kode Pos wajib diisi.'),
      latitude: coordinate('Latitude', 90),
      longitude: coordinate('Longitude', 180),
    })
    .refine((v) => (v.latitude === null) === (v.longitude === null), {
      message:
        'Isi Latitude dan Longitude bersama-sama, atau kosongkan keduanya.',
      path: ['longitude'],
    }),
)

const form = useForm({
  validationSchema: formSchema,
  initialValues: {
    street: '',
    rt: '',
    rw: '',
    village: '',
    district: '',
    city: '',
    province: '',
    country: 'Indonesia',
    postalCode: '',
    latitude: null,
    longitude: null,
  },
})

watch(
  () => props.draftAddress,
  (newVal) => {
    form.resetForm({
      values: {
        street: newVal.street || '',
        rt: newVal.rt || '',
        rw: newVal.rw || '',
        village: newVal.village || '',
        district: newVal.district || '',
        city: newVal.city || '',
        province: newVal.province || '',
        country: newVal.country || 'Indonesia',
        postalCode: newVal.postalCode || '',
        latitude: newVal.latitude ?? null,
        longitude: newVal.longitude ?? null,
      },
    })
  },
  { immediate: true, deep: true },
)

const onSave = form.handleSubmit((values) => {
  emit('update:draftAddress', values)
  emit('save')
})
</script>

<template>
  <div>
    <div class="px-6 pt-3 pb-6">
      <div class="grid gap-4 md:grid-cols-2">
        <FloatingField
          v-slot="{ componentField }"
          name="street"
          label="Alamat"
          required
        >
          <div class="content-start md:col-span-2">
            <FormControl>
              <Textarea v-bind="componentField" />
            </FormControl>
          </div>
        </FloatingField>

        <FloatingField
          v-slot="{ componentField }"
          name="rt"
          label="RT"
        >
          <div class="content-start">
            <FormControl>
              <Input v-bind="componentField" />
            </FormControl>
          </div>
        </FloatingField>

        <FloatingField
          v-slot="{ componentField }"
          name="rw"
          label="RW"
        >
          <div class="content-start">
            <FormControl>
              <Input v-bind="componentField" />
            </FormControl>
          </div>
        </FloatingField>

        <FloatingField
          v-slot="{ componentField }"
          name="village"
          label="Kelurahan / Desa"
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
          name="district"
          label="Kecamatan"
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
          name="city"
          label="Kota / Kabupaten"
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
          name="province"
          label="Provinsi"
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
          name="country"
          label="Negara"
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
          name="postalCode"
          label="Kode Pos"
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
          name="latitude"
          label="Latitude"
        >
          <div class="content-start">
            <FormControl>
              <Input
                type="text"
                inputmode="decimal"
                v-bind="componentField"
              />
            </FormControl>
          </div>
        </FloatingField>

        <FloatingField
          v-slot="{ componentField }"
          name="longitude"
          label="Longitude"
        >
          <div class="content-start">
            <FormControl>
              <Input
                type="text"
                inputmode="decimal"
                v-bind="componentField"
              />
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
        {{ isSaving ? 'Menyimpan...' : 'Simpan & Selesai' }}
      </Button>
    </div>
  </div>
</template>
