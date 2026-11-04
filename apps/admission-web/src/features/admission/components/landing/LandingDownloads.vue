<script setup lang="ts">
import { Download, FileText } from '@lucide/vue'
import { admissionApi } from '../../api/admissionApi'
import type { AdmissionActiveDownload } from '../../types'
import { formatFileSize } from '../../utils'

defineProps<{ downloads: AdmissionActiveDownload[] }>()
</script>

<template>
  <section
    v-if="downloads.length"
    id="unduhan"
    aria-labelledby="unduhan-title"
    class="scroll-mt-14 bg-[#f5f2e9] py-14 sm:py-20"
  >
    <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <h2
        id="unduhan-title"
        class="font-[Georgia,serif] text-4xl font-normal leading-[1.1] tracking-tight text-[#203f73] sm:text-5xl"
      >
        Unduhan
      </h2>
      <p class="mt-5 max-w-xl text-sm leading-7 text-slate-700">
        Brosur dan formulir pendaftaran yang bisa kamu unduh, cetak, lalu bawa
        ke sekolah.
      </p>
      <ul class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="item in downloads"
          :key="item.id"
          class="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
        >
          <div class="flex items-start gap-3">
            <FileText
              class="mt-0.5 size-6 shrink-0 text-[#836d29]"
              aria-hidden="true"
            />
            <div class="min-w-0">
              <h3 class="break-words font-semibold text-[#203f73]">
                {{ item.title }}
              </h3>
              <p
                v-if="item.description"
                class="mt-1 break-words text-sm leading-6 text-slate-700"
              >
                {{ item.description }}
              </p>
              <p class="mt-2 text-xs text-slate-600">
                PDF · {{ formatFileSize(item.sizeBytes) }}
              </p>
            </div>
          </div>
          <a
            :href="admissionApi.downloadFileUrl(item.id)"
            download
            rel="noopener"
            class="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#203f73] px-4 text-sm font-semibold text-white hover:bg-[#1a335c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#203f73] sm:self-start"
          >
            <Download
              class="size-4"
              aria-hidden="true"
            />
            Unduh <span class="sr-only">{{ item.title }}</span>
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>
