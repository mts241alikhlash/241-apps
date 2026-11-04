<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LandingFaq from '../components/landing/LandingFaq.vue'
import LandingFooter from '../components/landing/LandingFooter.vue'
import LandingHero from '../components/landing/LandingHero.vue'
import LandingHowItWorks from '../components/landing/LandingHowItWorks.vue'
import LandingInfo from '../components/landing/LandingInfo.vue'
import LandingNavbar from '../components/landing/LandingNavbar.vue'
import LandingRequirements from '../components/landing/LandingRequirements.vue'
import LandingWaveSection from '../components/landing/LandingWaveSection.vue'
import LandingLife from '../components/landing/LandingLife.vue'
import LandingStories from '../components/landing/LandingStories.vue'
import LandingCta from '../components/landing/LandingCta.vue'
import LandingDownloads from '../components/landing/LandingDownloads.vue'
import LandingPpdbShowcase from '../components/landing/LandingPpdbShowcase.vue'
import { useLandingContent } from '../composables/useLandingContent'
import { usePublicAdmission } from '../composables/usePublicAdmission'
import type {
  ActiveWave,
  AdmissionActiveDownload,
  AdmissionDocumentType,
} from '../types'

const props = withDefaults(defineProps<{ mode?: 'published' | 'draft' }>(), {
  mode: 'published',
})

const route = useRoute()
const router = useRouter()

const { fetchActiveWaves, fetchActiveDownloads } = usePublicAdmission()
const landing = useLandingContent(props.mode)
const content = landing.content

const waves = ref<ActiveWave[]>([])
const documentTypes = ref<AdmissionDocumentType[]>([])
const downloads = ref<AdmissionActiveDownload[]>([])
const isLoading = ref(true)
const hasError = ref(false)

const primaryWave = computed(() => waves.value[0] ?? null)

async function loadAdmission() {
  isLoading.value = true
  hasError.value = false
  const data = await fetchActiveWaves()

  if (data) {
    waves.value = data.waves
    documentTypes.value = data.documentTypes
  } else {
    hasError.value = true
  }

  isLoading.value = false
}

async function loadDownloads() {
  downloads.value = await fetchActiveDownloads()
}

onMounted(() => {
  if (route.query.signup === '1') {
    void router.replace({ name: 'login', query: route.query })
    return
  }
  void landing.load()
  void loadAdmission()
  void loadDownloads()
})
</script>

<template>
  <div class="admission-landing min-h-screen bg-[#f5f2e9] text-slate-950">
    <div
      v-if="mode === 'draft'"
      data-test="draft-banner"
      class="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center justify-between gap-2 border-t border-amber-300 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-950 shadow-lg"
      role="status"
    >
      <span>Pratinjau draf — belum terbit</span>
      <slot name="banner-action" />
    </div>
    <a
      href="#landing-main"
      class="landing-skip-link"
      >Langsung ke isi halaman</a
    >
    <LandingNavbar
      :ready="landing.ready.value"
      :show-stories="content.stories.items.length > 0"
    />

    <main
      id="landing-main"
      tabindex="-1"
    >
      <p
        v-if="landing.ready.value && landing.error.value"
        data-test="draft-error"
        role="alert"
        class="mx-auto max-w-xl p-8 text-center text-sm"
      >
        Pratinjau draf gagal dimuat. Kembali ke pengaturan, lalu coba lagi.
      </p>
      <template v-else-if="landing.ready.value">
        <LandingHero
          :content="content.hero"
          :error="hasError"
          :wave="primaryWave"
          :loading="isLoading"
        />
        <LandingLife :content="content.life" />
        <div
          v-if="hasError"
          id="gelombang"
          role="alert"
          class="scroll-mt-14 border-b border-amber-200 bg-amber-50 p-5 text-center text-sm text-amber-950"
        >
          Informasi pendaftaran belum dapat dimuat. Silakan coba kembali.
          <button
            type="button"
            class="ml-3 inline-flex min-h-11 items-center font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-950"
            @click="loadAdmission"
          >
            Coba lagi
          </button>
        </div>
        <LandingWaveSection
          v-if="!hasError"
          id="gelombang"
          :waves="waves"
          :loading="isLoading"
        />
        <LandingPpdbShowcase />
        <LandingInfo :content="content.info" />
        <LandingHowItWorks
          id="alur"
          :content="content.steps"
        />
        <LandingRequirements
          id="persyaratan"
          :document-types="documentTypes"
          :loading="isLoading"
        />
        <LandingDownloads :downloads="downloads" />
        <LandingStories :content="content.stories" />
        <LandingFaq
          id="faq"
          :content="content.faq"
        />
        <LandingCta :content="content.closing" />
      </template>
    </main>

    <LandingFooter
      :show-downloads="downloads.length > 0"
      :show-info="content.info.posters.length > 0"
      :show-stories="content.stories.items.length > 0"
    />
  </div>
</template>

<style scoped>
.landing-skip-link {
  position: fixed;
  z-index: 100;
  left: 1rem;
  top: 1rem;
  padding: 0.75rem 1rem;
  background: #fff;
  color: #162d53;
  transform: translateY(-200%);
}
.landing-skip-link:focus {
  transform: translateY(0);
  outline: 2px solid #203f73;
  outline-offset: 2px;
}
.admission-landing :deep(h2) {
  text-wrap: balance;
}
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .admission-landing :deep(.landing-photo-reveal) {
      animation: landing-photo-arrive linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 85%;
    }
  }
}
@keyframes landing-photo-arrive {
  from {
    opacity: 0.5;
    transform: translateY(1.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
