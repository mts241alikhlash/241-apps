<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Card, CardContent } from '@mts241alikhlash/ui/card'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import type { AdmissionApplication } from '../types'
import { formatDate, formatIDR } from '../utils'

const props = defineProps<{
  application: AdmissionApplication
  academicYearName: string | null
  requiresAgreement: boolean
}>()

const emit = defineEmits<{ start: [] }>()

const agreed = ref(false)

const requiredDocuments = computed(() =>
  (props.application.documentTypes ?? [])
    .filter((type) => type.requirement === 'REQUIRED')
    .map((type) => type.name),
)
</script>

<template>
  <div class="space-y-5 text-[length:var(--text-control,0.75rem)]">
    <Card gap="none">
      <CardContent class="space-y-5 px-4 py-4 sm:px-5">
        <section class="space-y-1 border-b pb-4">
          <p class="text-xs font-medium text-muted-foreground">
            Gelombang Pendaftaran
          </p>
          <p class="text-base font-medium break-words">
            {{ application.wave?.name }}
            <span
              v-if="academicYearName"
              class="font-normal text-muted-foreground"
              >· {{ academicYearName }}</span
            >
          </p>
          <p v-if="application.wave">
            Periode {{ formatDate(application.wave.startDate) }} –
            {{ formatDate(application.wave.endDate) }} · Biaya
            {{ formatIDR(Number(application.wave.registrationFee)) }}
          </p>
          <p class="text-muted-foreground">
            No. Pendaftaran {{ application.registrationNumber }}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-base font-medium">Ketentuan Pendaftaran</h2>
          <p
            v-if="application.wave?.description"
            class="whitespace-pre-line"
          >
            {{ application.wave.description }}
          </p>
          <ol class="list-decimal space-y-2 pl-5">
            <li>
              Isi data sesuai dokumen resmi (Kartu Keluarga, akta kelahiran, dan
              ijazah/SKL).
            </li>
            <li>
              Isian tersimpan setiap berpindah langkah, jadi formulir bisa
              dilanjutkan kapan saja sebelum dikirim.
            </li>
            <li>
              Siapkan berkas wajib
              <template v-if="requiredDocuments.length">
                ({{ requiredDocuments.join(', ') }})
              </template>
              dalam format JPG, PNG, atau PDF, maksimal 5 MB per berkas.
            </li>
            <li v-if="application.wave">
              Biaya pendaftaran
              {{ formatIDR(Number(application.wave.registrationFee)) }}
              ditransfer ke rekening yang tertera di langkah Pembayaran. Bukti
              transfer boleh diunggah setelah formulir dikirim.
            </li>
            <li v-if="application.wave">
              Formulir dikirim paling lambat
              {{ formatDate(application.wave.endDate) }}.
            </li>
            <li>
              Setelah dikirim, formulir tidak dapat diubah kecuali panitia
              meminta revisi. Pengumuman hasil disampaikan melalui akun ini.
            </li>
          </ol>
        </section>
      </CardContent>
    </Card>

    <label
      v-if="requiresAgreement"
      class="flex items-start gap-2"
    >
      <Checkbox
        :model-value="agreed"
        class="mt-0.5"
        @update:model-value="agreed = $event === true"
      />
      <span>
        Saya sudah membaca dan memahami ketentuan pendaftaran, dan data yang
        saya isi adalah data yang benar.
      </span>
    </label>

    <div class="flex justify-end">
      <Button
        :disabled="requiresAgreement && !agreed"
        @click="emit('start')"
      >
        {{ requiresAgreement ? 'Mulai Isi Formulir' : 'Tutup' }}
      </Button>
    </div>
  </div>
</template>
