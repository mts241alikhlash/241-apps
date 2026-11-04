<script setup lang="ts">
import { computed } from 'vue'
import { Input } from '@mts241alikhlash/ui/input'
import {
  RegionSelect,
  type RegionCodes,
  type RegionNames,
} from '@/features/platform/address'
import type { AddressFormState } from '../types'

const address = defineModel<AddressFormState>({ required: true })

const regionCodes = computed<RegionCodes>(() => ({
  provinceCode: address.value.provinceCode,
  regencyCode: address.value.regencyCode,
  districtCode: address.value.districtCode,
  villageCode: address.value.villageCode,
}))

function setRegionCodes(codes: RegionCodes) {
  Object.assign(address.value, codes)
}

function setRegionNames(names: RegionNames) {
  Object.assign(address.value, names)
}
</script>

<template>
  <div class="grid gap-5 md:grid-cols-2 items-start">
    <div class="md:col-span-2 space-y-2">
      <label class="text-sm font-medium">Jalan / Alamat</label>
      <Input
        v-model="address.street"
        placeholder="Nama jalan, nomor rumah"
      />
    </div>
    <div class="grid grid-cols-2 gap-3 md:col-span-2">
      <div class="space-y-2">
        <label class="text-sm font-medium">RT</label>
        <Input
          v-model="address.rt"
          placeholder="RT"
        />
      </div>
      <div class="space-y-2">
        <label class="text-sm font-medium">RW</label>
        <Input
          v-model="address.rw"
          placeholder="RW"
        />
      </div>
    </div>
    <div class="md:col-span-2">
      <RegionSelect
        :model-value="regionCodes"
        @update:model-value="setRegionCodes"
        @update:names="setRegionNames"
      />
    </div>
    <div class="space-y-2">
      <label class="text-sm font-medium">Kode Pos</label>
      <Input
        v-model="address.postalCode"
        placeholder="Kode pos"
      />
    </div>
    <div class="space-y-2">
      <label class="text-sm font-medium">Negara</label>
      <Input
        v-model="address.country"
        placeholder="Negara"
      />
    </div>
  </div>
</template>
