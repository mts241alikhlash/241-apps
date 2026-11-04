<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDown } from '@lucide/vue'
import { useInView } from '../../composables/useInView'
import { landingDefaults } from '../../data/landingDefaults'
import type { LandingFaqContent } from '../../types/landing'

const props = withDefaults(defineProps<{ content?: LandingFaqContent }>(), {
  content: () => landingDefaults.faq,
})

const questions = props.content.items

const columns = computed(() => {
  const half = Math.ceil(questions.length / 2)
  return [questions.slice(0, half), questions.slice(half)]
})

const { target, visible } = useInView()
</script>

<template>
  <section
    :ref="target"
    class="scroll-mt-14 bg-white py-14 sm:py-20 lg:flex lg:min-h-[calc(100svh-3.5rem)] lg:items-center lg:py-8"
  >
    <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-16">
        <h2
          class="max-w-xl font-[Georgia,serif] text-4xl font-normal leading-[1.1] tracking-tight text-[#203f73] sm:text-5xl"
        >
          {{ content.title }}
        </h2>
        <p class="max-w-md text-sm leading-7 text-slate-600">
          {{ content.description }}
        </p>
      </div>

      <div class="mt-10 grid items-start gap-3 lg:grid-cols-2 lg:gap-4">
        <div
          v-for="(column, columnIndex) in columns"
          :key="columnIndex"
          class="grid gap-3 lg:gap-4"
        >
          <details
            v-for="(item, index) in column"
            :key="item.question"
            class="group rounded-2xl bg-[#f5f2e9] px-5 transition duration-500 ease-out open:bg-[#efe9d8] motion-reduce:transition-none"
            :class="
              visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            "
            :style="{ transitionDelay: `${(index * 2 + columnIndex) * 70}ms` }"
          >
            <summary
              class="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 text-left text-sm font-semibold text-[#203f73] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#203f73] marker:content-none sm:text-base"
            >
              {{ item.question }}
              <ChevronDown
                class="size-5 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            <p class="pb-5 pr-8 text-sm leading-7 text-slate-700">
              {{ item.answer }}
            </p>
          </details>
        </div>
      </div>
    </div>
  </section>
</template>
