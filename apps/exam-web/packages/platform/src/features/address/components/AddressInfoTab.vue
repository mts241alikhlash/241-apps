<script setup lang="ts">
import { computed, reactive, ref, watch, useId } from 'vue'
import { Input } from '@mts241alikhlash/ui/input'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import { Button } from '@mts241alikhlash/ui/button'
import { Loader2 } from '@lucide/vue'
import RegionSelect from './RegionSelect.vue'
import { useAddress } from '../composables/useAddress'
import type { AddressData, AddressRecord, AddressSavePayload } from '../types'
import type { RegionCodes, RegionNames } from '../types'

const props = defineProps<{
  data: AddressData
  rawAddress?: AddressRecord | null
  isEditable: boolean
}>()

const emit = defineEmits<{
  save: [payload: AddressSavePayload]
}>()

const { isSaving } = useAddress()
const fieldId = useId()

const form = reactive({
  street: '',
  rt: '',
  rw: '',
  village: '',
  district: '',
  city: '',
  province: '',
  provinceCode: '',
  regencyCode: '',
  districtCode: '',
  villageCode: '',
  country: 'Indonesia',
  postalCode: '',
})

watch(
  () => [props.rawAddress, props.data.address] as const,
  ([rawAddr, dataAddr]) => {
    const addr = rawAddr ?? dataAddr
    if (addr) {
      form.street = addr.street ?? ''
      form.rt = addr.rt ?? ''
      form.rw = addr.rw ?? ''
      form.village = addr.village ?? ''
      form.district = addr.district ?? ''
      form.city = addr.city ?? ''
      form.province = addr.province ?? ''
      form.provinceCode = addr.provinceCode ?? ''
      form.regencyCode = addr.regencyCode ?? ''
      form.districtCode = addr.districtCode ?? ''
      form.villageCode = addr.villageCode ?? ''
      form.country = addr.country ?? 'Indonesia'
      form.postalCode = addr.postalCode ?? ''
    }
  },
  { immediate: true },
)

const regionError = ref('')
const REGION_KEYS = [
  'provinceCode',
  'regencyCode',
  'districtCode',
  'villageCode',
] as const
const regionCodes = computed<RegionCodes>(() => ({
  provinceCode: form.provinceCode,
  regencyCode: form.regencyCode,
  districtCode: form.districtCode,
  villageCode: form.villageCode,
}))

function setRegionCodes(codes: RegionCodes) {
  Object.assign(form, codes)
  regionError.value = ''
}

function setRegionNames(names: RegionNames) {
  Object.assign(form, names)
}

function handleSubmit() {
  if (!props.isEditable) return
  if (!REGION_KEYS.every((key) => form[key])) {
    regionError.value =
      'Pilih provinsi, kabupaten/kota, kecamatan, dan desa/kelurahan'
    return
  }
  emit('save', {
    street: form.street,
    rt: form.rt === '' ? null : form.rt,
    rw: form.rw === '' ? null : form.rw,
    village: form.village,
    district: form.district,
    city: form.city,
    province: form.province,
    provinceCode: form.provinceCode,
    regencyCode: form.regencyCode,
    districtCode: form.districtCode,
    villageCode: form.villageCode,
    country: form.country,
    postalCode: form.postalCode === '' ? null : form.postalCode,
  })
}
</script>

<template>
  <div class="py-4">
    <form
      class="space-y-4"
      @submit.prevent="handleSubmit"
    >
      <div class="grid gap-5 md:grid-cols-2">
        <FloatingLabelField
          label="Jalan / Dusun"
          :for="`${fieldId}-street`"
          :required="isEditable"
          :floating="!isEditable || !!form.street"
          class="md:col-span-2"
        >
          <Input
            :id="`${fieldId}-street`"
            v-model="form.street"
            :disabled="!isEditable"
            class="disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
            required
          />
        </FloatingLabelField>

        <FloatingLabelField
          label="RT"
          :for="`${fieldId}-rt`"
          :floating="!isEditable || !!form.rt"
        >
          <Input
            :id="`${fieldId}-rt`"
            v-model="form.rt"
            maxlength="5"
            :disabled="!isEditable"
            class="disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
          />
        </FloatingLabelField>

        <FloatingLabelField
          label="RW"
          :for="`${fieldId}-rw`"
          :floating="!isEditable || !!form.rw"
        >
          <Input
            :id="`${fieldId}-rw`"
            v-model="form.rw"
            maxlength="5"
            :disabled="!isEditable"
            class="disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
          />
        </FloatingLabelField>

        <template v-if="isEditable">
          <div class="space-y-2 md:col-span-2">
            <RegionSelect
              :model-value="regionCodes"
              @update:model-value="setRegionCodes"
              @update:names="setRegionNames"
            />
            <p
              v-if="regionError"
              role="alert"
              class="text-sm text-destructive"
            >
              {{ regionError }}
            </p>
          </div>
        </template>
        <template v-else>
          <FloatingLabelField
            label="Desa / Kelurahan"
            :for="`${fieldId}-village`"
            floating
          >
            <Input
              :id="`${fieldId}-village`"
              v-model="form.village"
              disabled
              class="disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
            />
          </FloatingLabelField>

          <FloatingLabelField
            label="Kecamatan"
            :for="`${fieldId}-district`"
            floating
          >
            <Input
              :id="`${fieldId}-district`"
              v-model="form.district"
              disabled
              class="disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
            />
          </FloatingLabelField>

          <FloatingLabelField
            label="Kabupaten / Kota"
            :for="`${fieldId}-city`"
            floating
          >
            <Input
              :id="`${fieldId}-city`"
              v-model="form.city"
              disabled
              class="disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
            />
          </FloatingLabelField>

          <FloatingLabelField
            label="Provinsi"
            :for="`${fieldId}-province`"
            floating
          >
            <Input
              :id="`${fieldId}-province`"
              v-model="form.province"
              disabled
              class="disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
            />
          </FloatingLabelField>
        </template>

        <FloatingLabelField
          label="Negara"
          :for="`${fieldId}-country`"
          floating
        >
          <Input
            :id="`${fieldId}-country`"
            v-model="form.country"
            disabled
            class="disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
          />
        </FloatingLabelField>

        <FloatingLabelField
          label="Kode Pos"
          :for="`${fieldId}-postal-code`"
          :floating="!isEditable || !!form.postalCode"
        >
          <Input
            :id="`${fieldId}-postal-code`"
            v-model="form.postalCode"
            maxlength="10"
            :disabled="!isEditable"
            class="disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
          />
        </FloatingLabelField>
      </div>

      <div
        v-if="isEditable"
        class="flex justify-end gap-3 pt-4"
      >
        <Button
          type="submit"
          :disabled="isSaving"
        >
          <Loader2
            v-if="isSaving"
            class="mr-2 h-4 w-4 animate-spin"
          />
          {{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}
        </Button>
      </div>
    </form>
  </div>
</template>
