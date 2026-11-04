<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { admissionApi } from '../api/admissionApi'
import type { RegionCodesForm } from '../composables/useApplicationFormState'
import type { RegionNode } from '../types'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import OptionSelect from './OptionSelect.vue'

defineProps<{ disabled?: boolean; invalid?: boolean }>()

const model = defineModel<RegionCodesForm>({ required: true })

const LEVELS = [
  { key: 'provinceCode', label: 'Provinsi' },
  { key: 'regencyCode', label: 'Kabupaten/Kota' },
  { key: 'districtCode', label: 'Kecamatan' },
  { key: 'villageCode', label: 'Desa/Kelurahan' },
] as const

const options = ref<RegionNode[][]>([[], [], [], []])
const latest = [0, 0, 0, 0]

function asOptions(nodes: RegionNode[]) {
  return nodes.map((node) => ({ id: node.code, name: node.name }))
}

async function childrenOf(code: string): Promise<RegionNode[]> {
  try {
    return (await admissionApi.getRegionChildren(code)).data.data
  } catch (error: unknown) {
    toast.error(getIndonesianErrorMessage(error, 'Gagal memuat wilayah.'))
    return []
  }
}

onMounted(async () => {
  try {
    options.value[0] = (await admissionApi.getProvinces()).data.data
  } catch (error: unknown) {
    toast.error(getIndonesianErrorMessage(error, 'Gagal memuat wilayah.'))
  }
  await Promise.all(
    LEVELS.slice(0, 3).map(async ({ key }, index) => {
      const code = model.value[key]
      if (code) options.value[index + 1] = await childrenOf(code)
    }),
  )
})

async function choose(index: number, code: string) {
  const next = { ...model.value }
  LEVELS.forEach(({ key }, level) => {
    if (level === index) next[key] = code
    else if (level > index) next[key] = ''
  })
  model.value = next
  for (let level = index + 1; level < LEVELS.length; level++) {
    options.value[level] = []
  }
  const request = ++latest[index]
  if (code && index < LEVELS.length - 1) {
    const children = await childrenOf(code)
    if (request === latest[index]) options.value[index + 1] = children
  }
}
</script>

<template>
  <div class="grid gap-x-4 gap-y-1 sm:grid-cols-2">
    <FloatingLabelField
      v-for="(level, index) in LEVELS"
      :key="level.key"
      :label="level.label"
      :error="
        invalid && !model[level.key]
          ? `${level.label} wajib dipilih`
          : undefined
      "
      floating
      required
    >
      <OptionSelect
        :label="level.label"
        :model-value="model[level.key]"
        :options="asOptions(options[index])"
        :disabled="disabled"
        :invalid="invalid && !model[level.key]"
        @update:model-value="choose(index, $event)"
      />
    </FloatingLabelField>
  </div>
</template>
