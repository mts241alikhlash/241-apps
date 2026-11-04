<script setup lang="ts">
import { landingDefaults } from '../../data/landingDefaults'
import type { LandingStepsContent } from '../../types/landing'

withDefaults(defineProps<{ content?: LandingStepsContent }>(), {
  content: () => landingDefaults.steps,
})

const COLUMNS = {
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
} as const
</script>

<template>
  <section
    class="scroll-mt-14 bg-[#203f73] py-14 text-white sm:py-20 lg:flex lg:min-h-[calc(100svh-3.5rem)] lg:items-center lg:py-8"
  >
    <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-16">
        <h2
          class="font-[Georgia,serif] text-4xl font-normal leading-[1.1] tracking-tight sm:text-5xl"
        >
          {{ content.title }}
        </h2>
        <p class="max-w-md text-sm leading-7 text-slate-200">
          {{ content.description }}
        </p>
      </div>

      <ol
        class="mt-10 grid border-t border-white/30 sm:grid-cols-2"
        :class="COLUMNS[content.items.length as 3 | 4 | 5]"
      >
        <li
          v-for="(step, index) in content.items"
          :key="step.title"
          class="grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-white/30 py-6 sm:block sm:pr-8 lg:border-r lg:pl-5 lg:first:pl-0 lg:last:border-r-0"
        >
          <span
            class="row-span-2 block font-[Georgia,serif] text-3xl tabular-nums text-[#e5cc87] sm:text-4xl"
          >
            {{ String(index + 1).padStart(2, '0') }}
          </span>
          <h3 class="font-semibold sm:mt-8">{{ step.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-slate-200">
            {{ step.description }}
          </p>
        </li>
      </ol>
    </div>
  </section>
</template>
