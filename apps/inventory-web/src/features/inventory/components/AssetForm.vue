<script setup lang="ts">
import { computed, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import type {
  InventoryAsset,
  InventoryMetadata,
  AssetSavePayload,
} from '../types'
import {
  Button,
  DatePicker,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  FormControl,
  FloatingField,
  Textarea,
} from '@mts241alikhlash/ui'
import { Separator } from '@mts241alikhlash/ui/separator'

const props = defineProps<{
  asset?: InventoryAsset | null
  metadata: InventoryMetadata
  isSaving: boolean
}>()

const emit = defineEmits<{
  save: [data: AssetSavePayload]
  cancel: []
}>()

const isEdit = computed(() => !!props.asset)

const schema = isEdit.value
  ? z.object({
      name: z
        .string()
        .min(1, 'Nama aset wajib diisi.')
        .max(150, 'Nama aset tidak boleh lebih dari 150 karakter.'),
      categoryId: z.string().min(1, 'Silakan pilih kategori aset.'),
      brand: z
        .string()
        .max(100, 'Merek tidak boleh lebih dari 100 karakter.')
        .optional()
        .or(z.literal('')),
      model: z
        .string()
        .max(100, 'Model tidak boleh lebih dari 100 karakter.')
        .optional()
        .or(z.literal('')),
      purchaseDate: z.string().min(1, 'Mohon tentukan tanggal pembelian.'),
      purchasePrice: z
        .number({ invalid_type_error: 'Nilai pembelian harus berupa angka.' })
        .min(0, 'Nilai pembelian tidak boleh kurang dari 0.'),
      fundingSourceId: z.string().optional().or(z.literal('none')),
      quantity: z.number().optional(),
      locationId: z.string().optional(),
      statusId: z.string().optional(),
      conditionId: z.string().optional(),
      notes: z.string().optional().or(z.literal('')),
    })
  : z.object({
      name: z
        .string()
        .min(1, 'Nama aset wajib diisi.')
        .max(150, 'Nama aset tidak boleh lebih dari 150 karakter.'),
      categoryId: z.string().min(1, 'Silakan pilih kategori aset.'),
      brand: z
        .string()
        .max(100, 'Merek tidak boleh lebih dari 100 karakter.')
        .optional()
        .or(z.literal('')),
      model: z
        .string()
        .max(100, 'Model tidak boleh lebih dari 100 karakter.')
        .optional()
        .or(z.literal('')),
      purchaseDate: z.string().min(1, 'Mohon tentukan tanggal pembelian.'),
      purchasePrice: z
        .number({ invalid_type_error: 'Nilai pembelian harus berupa angka.' })
        .min(0, 'Nilai pembelian tidak boleh kurang dari 0.'),
      fundingSourceId: z.string().optional().or(z.literal('none')),
      quantity: z
        .number({ invalid_type_error: 'Jumlah harus berupa angka.' })
        .int('Jumlah harus bilangan bulat.')
        .min(1, 'Jumlah minimal 1.'),
      locationId: z.string().min(1, 'Silakan pilih lokasi penempatan.'),
      statusId: z.string().min(1, 'Silakan tentukan status aset.'),
      conditionId: z.string().min(1, 'Silakan tentukan kondisi aset.'),
      notes: z.string().optional().or(z.literal('')),
    })

const formSchema = toTypedSchema(schema)

const { handleSubmit, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: props.asset
    ? {
        name: props.asset.name,
        categoryId: props.asset.categoryId,
        brand: props.asset.brand ?? '',
        model: props.asset.model ?? '',
        purchaseDate: props.asset.purchaseDate
          ? props.asset.purchaseDate.split('T')[0]
          : '',
        purchasePrice: Number(props.asset.purchasePrice),
        fundingSourceId: props.asset.fundingSourceId ?? 'none',
        quantity: 1,
        locationId: props.asset.units?.[0]?.locationId ?? '',
        statusId: props.asset.units?.[0]?.statusId ?? '',
        conditionId: props.asset.units?.[0]?.conditionId ?? '',
        notes: props.asset.notes ?? '',
      }
    : {
        name: '',
        categoryId: '',
        brand: '',
        model: '',
        purchaseDate: '',
        purchasePrice: 0,
        fundingSourceId: 'none',
        quantity: 1,
        locationId: '',
        statusId: '',
        conditionId: '',
        notes: '',
      },
})

watch(
  () => props.asset,
  (newAsset) => {
    if (newAsset) {
      const firstUnit = newAsset.units?.[0]
      resetForm({
        values: {
          name: newAsset.name,
          categoryId: newAsset.categoryId,
          brand: newAsset.brand ?? '',
          model: newAsset.model ?? '',
          purchaseDate: newAsset.purchaseDate
            ? newAsset.purchaseDate.split('T')[0]
            : '',
          purchasePrice: Number(newAsset.purchasePrice),
          fundingSourceId: newAsset.fundingSourceId ?? 'none',
          quantity: 1,
          locationId: firstUnit?.locationId ?? '',
          statusId: firstUnit?.statusId ?? '',
          conditionId: firstUnit?.conditionId ?? '',
          notes: newAsset.notes ?? '',
        },
      })
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

const blankToUndefined = (value?: string): string | undefined =>
  value && value.length > 0 ? value : undefined

const onSubmit = handleSubmit((values) => {
  emit('save', {
    ...values,
    brand: blankToUndefined(values.brand),
    model: blankToUndefined(values.model),
    fundingSourceId:
      values.fundingSourceId && values.fundingSourceId !== 'none'
        ? values.fundingSourceId
        : null,
    notes: blankToUndefined(values.notes),
  } as AssetSavePayload)
})
</script>

<template>
  <form
    class="space-y-6"
    @submit="onSubmit"
  >
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
      <div
        class="rounded-xl border bg-card p-5 space-y-4 text-sm flex flex-col"
      >
        <h3 class="text-sm font-semibold">Informasi Aset</h3>
        <Separator />
        <div class="grid grid-cols-2 gap-4">
          <FloatingField
            v-slot="{ componentField }"
            name="name"
            label="Nama Aset"
            required
          >
            <div class="content-start">
              <FormControl>
                <Input
                  v-bind="componentField"
                  :disabled="isSaving"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="categoryId"
            label="Kategori"
            required
          >
            <div class="content-start">
              <Select
                :model-value="value"
                :disabled="isSaving"
                @update:model-value="handleChange"
              >
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Pilih kategori aset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="cat in metadata.categories"
                    :key="cat.id"
                    :value="cat.id"
                  >
                    {{ cat.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="brand"
            label="Merek"
          >
            <div class="content-start">
              <FormControl>
                <Input
                  v-bind="componentField"
                  :disabled="isSaving"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="model"
            label="Model / Tipe"
          >
            <div class="content-start">
              <FormControl>
                <Input
                  v-bind="componentField"
                  :disabled="isSaving"
                />
              </FormControl>
            </div>
          </FloatingField>

          <template v-if="!isEdit">
            <FloatingField
              v-slot="{ value, handleChange }"
              name="quantity"
              label="Jumlah Unit"
              required
            >
              <div class="content-start">
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    :model-value="value"
                    :disabled="isSaving"
                    @update:model-value="handleChange(Number($event))"
                  />
                </FormControl>
              </div>
            </FloatingField>

            <FloatingField
              v-slot="{ value, handleChange }"
              name="locationId"
              label="Lokasi"
              required
            >
              <div class="content-start">
                <Select
                  :model-value="value"
                  :disabled="isSaving"
                  @update:model-value="handleChange"
                >
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Pilih lokasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="loc in metadata.locations"
                      :key="loc.id"
                      :value="loc.id"
                    >
                      {{ loc.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FloatingField>

            <FloatingField
              v-slot="{ value, handleChange }"
              name="statusId"
              label="Status"
              required
            >
              <div class="content-start">
                <Select
                  :model-value="value"
                  :disabled="isSaving"
                  @update:model-value="handleChange"
                >
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="status in metadata.statuses"
                      :key="status.id"
                      :value="status.id"
                    >
                      {{ status.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FloatingField>

            <FloatingField
              v-slot="{ value, handleChange }"
              name="conditionId"
              label="Kondisi"
              required
            >
              <div class="content-start">
                <Select
                  :model-value="value"
                  :disabled="isSaving"
                  @update:model-value="handleChange"
                >
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Pilih kondisi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="cond in metadata.conditions"
                      :key="cond.id"
                      :value="cond.id"
                    >
                      {{ cond.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FloatingField>
          </template>
        </div>
      </div>

      <div
        class="rounded-xl border bg-card p-5 space-y-4 text-sm flex flex-col"
      >
        <h3 class="text-sm font-semibold">Keuangan & Administrasi</h3>
        <Separator />
        <FloatingField
          v-slot="{ value, handleChange }"
          name="purchaseDate"
          label="Tanggal Pembelian"
          required
        >
          <div class="content-start">
            <FormControl>
              <DatePicker
                :model-value="value"
                :disabled="isSaving"
                @update:model-value="handleChange"
              />
            </FormControl>
          </div>
        </FloatingField>

        <div class="grid grid-cols-2 gap-4 items-start">
          <FloatingField
            v-slot="{ value, handleChange }"
            name="purchasePrice"
            label="Harga Beli (Rp)"
            required
          >
            <div class="content-start">
              <FormControl>
                <Input
                  type="number"
                  :model-value="value"
                  :disabled="isSaving"
                  @update:model-value="handleChange(Number($event))"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="fundingSourceId"
            label="Sumber Dana"
          >
            <div class="content-start">
              <Select
                :model-value="value"
                :disabled="isSaving"
                @update:model-value="handleChange"
              >
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Pilih sumber" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">(Tanpa Sumber Dana)</SelectItem>
                  <SelectItem
                    v-for="fund in metadata.fundingSources"
                    :key="fund.id"
                    :value="fund.id"
                  >
                    {{ fund.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>
        </div>

        <FloatingField
          v-slot="{ componentField }"
          name="notes"
          label="Catatan / Keterangan"
        >
          <div class="content-start">
            <FormControl>
              <Textarea
                v-bind="componentField"
                :disabled="isSaving"
                rows="4"
                class="resize-none"
                style="field-sizing: fixed"
              />
            </FormControl>
          </div>
        </FloatingField>
      </div>
    </div>

    <div class="flex items-center justify-end gap-3 pt-2">
      <Button
        type="button"
        variant="outline"
        :disabled="isSaving"
        @click="emit('cancel')"
      >
        Batal
      </Button>
      <Button
        type="submit"
        :disabled="isSaving"
      >
        {{
          isSaving
            ? 'Menyimpan...'
            : isEdit
              ? 'Perbarui Aset'
              : 'Simpan Aset Baru'
        }}
      </Button>
    </div>
  </form>
</template>
