<script setup lang="ts">
import { ref, reactive, watch, onMounted, useId } from 'vue'
import { Loader2 } from '@lucide/vue'
import { Input } from '@mts241alikhlash/ui/input'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import {
  religionRefApi as religionApi,
  bloodTypeRefApi as bloodTypeApi,
} from '../api/profileReferenceApi'
import { DatePicker } from '@mts241alikhlash/ui'
import type {
  ProfileDisplayData,
  UserGender,
  MaritalStatus,
  RawProfileData,
  ProfileUpdatePayload,
} from '../types'

const props = defineProps<{
  data: ProfileDisplayData
  rawProfile?: RawProfileData | null
  isEditable: boolean
  isSaving: boolean
}>()

const emit = defineEmits<{
  save: [payload: ProfileUpdatePayload]
}>()

const religions = ref<{ id: string; name: string }[]>([])
const bloodTypes = ref<{ id: string; name: string }[]>([])
const fieldId = useId()

const form = reactive({
  name: '',
  nik: '',
  gender: undefined as UserGender | undefined,
  birthPlace: '',
  birthDate: '',
  email: '',
  phone: '',
  bloodTypeId: undefined as string | undefined,
  religionId: undefined as string | undefined,
  maritalStatus: undefined as MaritalStatus | undefined,
  kk: '',
  npwp: '',
})

watch(
  () => props.rawProfile,
  (data) => {
    if (data) {
      form.name = data.name ?? ''
      form.nik = data.nik ?? ''
      form.gender = data.gender ?? undefined
      form.birthPlace = data.birthPlace ?? ''
      form.birthDate = data.birthDate
        ? String(data.birthDate).substring(0, 10)
        : ''
      form.email = data.email ?? ''
      form.phone = data.phone ?? ''
      form.bloodTypeId = data.bloodTypeId ?? data.bloodType?.id ?? undefined
      form.religionId = data.religionId ?? data.religion?.id ?? undefined
      form.maritalStatus = data.maritalStatus ?? undefined
      form.kk = data.noKk ?? ''
      form.npwp = data.npwp ?? ''
    }
  },
  { immediate: true },
)

onMounted(async () => {
  try {
    const [religionRes, bloodTypeRes] = await Promise.all([
      religionApi.getReligions({ limit: 100, isActive: true }),
      bloodTypeApi.getBloodTypes({ limit: 100, isActive: true }),
    ])
    religions.value = religionRes.data?.data ?? []
    bloodTypes.value = bloodTypeRes.data?.data ?? []
  } catch (error) {
    console.error('Gagal memuat data master untuk profil:', error)
  }
})

function handleSubmit() {
  if (!props.isEditable) return
  const payload: ProfileUpdatePayload = {
    name: form.name,
    nik: form.nik,
    gender: form.gender,
    birthPlace: form.birthPlace,
    birthDate: form.birthDate,
    email: form.email === '' ? null : form.email,
    phone: form.phone === '' ? null : form.phone,
    bloodTypeId:
      !form.bloodTypeId || form.bloodTypeId === 'none'
        ? null
        : form.bloodTypeId,
    religionId:
      !form.religionId || form.religionId === 'none' ? null : form.religionId,
    maritalStatus:
      !form.maritalStatus || (form.maritalStatus as string) === 'none'
        ? null
        : form.maritalStatus,
    noKk: form.kk === '' ? null : form.kk,
    npwp: form.npwp === '' ? null : form.npwp,
  }
  emit('save', payload)
}
</script>

<template>
  <div class="py-4">
    <form
      class="space-y-4 animate-in fade-in-50 duration-200"
      @submit.prevent="handleSubmit"
    >
      <div class="grid gap-5 md:grid-cols-2">
        <FloatingLabelField
          label="Nama Lengkap"
          :for="`${fieldId}-name`"
          :required="isEditable"
          :floating="!isEditable || !!form.name"
        >
          <Input
            :id="`${fieldId}-name`"
            v-model="form.name"
            maxlength="100"
            :disabled="!isEditable"
            class="disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
            required
          />
        </FloatingLabelField>

        <FloatingLabelField
          label="NIK"
          :for="`${fieldId}-nik`"
          :required="isEditable"
          :floating="!isEditable || !!form.nik"
        >
          <Input
            :id="`${fieldId}-nik`"
            v-model="form.nik"
            maxlength="16"
            :disabled="!isEditable"
            class="disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
            required
          />
        </FloatingLabelField>

        <FloatingLabelField
          label="No. Kartu Keluarga"
          :for="`${fieldId}-kk`"
          :floating="!isEditable || !!form.kk"
        >
          <Input
            :id="`${fieldId}-kk`"
            v-model="form.kk"
            maxlength="16"
            :disabled="!isEditable"
            class="disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
          />
        </FloatingLabelField>

        <FloatingLabelField
          label="NPWP"
          :for="`${fieldId}-npwp`"
          :floating="!isEditable || !!form.npwp"
        >
          <Input
            :id="`${fieldId}-npwp`"
            v-model="form.npwp"
            maxlength="20"
            :disabled="!isEditable"
            class="disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
          />
        </FloatingLabelField>
        <FloatingLabelField
          label="Tempat Lahir"
          :for="`${fieldId}-birth-place`"
          :required="isEditable"
          :floating="!isEditable || !!form.birthPlace"
        >
          <Input
            :id="`${fieldId}-birth-place`"
            v-model="form.birthPlace"
            maxlength="100"
            :disabled="!isEditable"
            class="disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
            required
          />
        </FloatingLabelField>

        <FloatingLabelField
          label="Tanggal Lahir"
          :for="`${fieldId}-birth-date`"
          :required="isEditable"
          floating
        >
          <DatePicker
            :id="`${fieldId}-birth-date`"
            v-model="form.birthDate"
            :disabled="!isEditable"
          />
        </FloatingLabelField>

        <FloatingLabelField
          label="Jenis Kelamin"
          :for="`${fieldId}-gender`"
          :required="isEditable"
          floating
        >
          <Select
            v-model="form.gender"
            :disabled="!isEditable"
          >
            <SelectTrigger
              :id="`${fieldId}-gender`"
              class="w-full disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Laki-laki</SelectItem>
              <SelectItem value="FEMALE">Perempuan</SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>

        <FloatingLabelField
          label="Agama"
          :for="`${fieldId}-religion`"
          floating
        >
          <Select
            v-model="form.religionId"
            :disabled="!isEditable"
          >
            <SelectTrigger
              :id="`${fieldId}-religion`"
              class="w-full disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tidak Tahu / Kosong</SelectItem>
              <SelectItem
                v-for="r in religions"
                :key="r.id"
                :value="r.id"
              >
                {{ r.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>

        <FloatingLabelField
          label="Golongan Darah"
          :for="`${fieldId}-blood-type`"
          floating
        >
          <Select
            v-model="form.bloodTypeId"
            :disabled="!isEditable"
          >
            <SelectTrigger
              :id="`${fieldId}-blood-type`"
              class="w-full disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tidak Tahu / Kosong</SelectItem>
              <SelectItem
                v-for="b in bloodTypes"
                :key="b.id"
                :value="b.id"
              >
                {{ b.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>

        <FloatingLabelField
          label="Status Pernikahan"
          :for="`${fieldId}-marital-status`"
          floating
        >
          <Select
            v-model="form.maritalStatus"
            :disabled="!isEditable"
          >
            <SelectTrigger
              :id="`${fieldId}-marital-status`"
              class="w-full disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tidak Tahu / Kosong</SelectItem>
              <SelectItem value="SINGLE">Belum Menikah</SelectItem>
              <SelectItem value="MARRIED">Menikah</SelectItem>
              <SelectItem value="DIVORCED">Cerai Hidup</SelectItem>
              <SelectItem value="WIDOWED">Cerai Mati</SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>
        <FloatingLabelField
          label="Email Pribadi"
          :for="`${fieldId}-email`"
          :floating="!isEditable || !!form.email"
        >
          <Input
            :id="`${fieldId}-email`"
            v-model="form.email"
            type="email"
            maxlength="255"
            :disabled="!isEditable"
            class="disabled:opacity-100 disabled:bg-muted/20 disabled:cursor-default disabled:text-foreground disabled:border-border/80"
          />
        </FloatingLabelField>

        <FloatingLabelField
          label="Nomor Telepon/HP"
          :for="`${fieldId}-phone`"
          :floating="!isEditable || !!form.phone"
        >
          <Input
            :id="`${fieldId}-phone`"
            v-model="form.phone"
            maxlength="15"
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
