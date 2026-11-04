<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'
import { AgendaCard, type PublicAgendaEntry } from '@/features/agenda'
import PostCard from '@/features/post/components/PostCard.vue'
import type { PostSummary } from '@/features/post'
import { homepageService } from '../services/homepageService'
import { useHomepageStore } from '../stores/homepageStore'
import { SECTION_LINKS, SECTION_TITLES } from '../types'

const store = useHomepageStore()

onMounted(() => {
  void homepageService.fetchPublic()
})

const sections = computed(() =>
  [...store.sections]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((section) => ({
      ...section,
      title: SECTION_TITLES[section.key] ?? section.key,
      link: SECTION_LINKS[section.key] ?? null,
    })),
)
</script>

<template>
  <div class="space-y-12">
    <section class="space-y-4 text-center">
      <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">
        MTs Persis 241
        <span class="block text-primary">Al-Ikhlash</span>
      </h1>
      <p class="mx-auto max-w-2xl text-muted-foreground">
        Berita, artikel, agenda, dan informasi resmi madrasah.
      </p>
    </section>

    <p
      v-if="store.loading"
      class="text-center text-sm text-muted-foreground"
    >
      Memuat konten…
    </p>

    <div
      v-else-if="store.unavailable"
      class="rounded-lg border border-dashed p-8 text-center text-muted-foreground"
    >
      Konten sedang tidak dapat dimuat. Silakan coba beberapa saat lagi.
    </div>

    <template v-else>
      <section
        v-for="section in sections"
        :key="section.key"
        class="space-y-4"
      >
        <div class="flex items-baseline justify-between gap-4">
          <h2 class="text-xl font-semibold">
            {{ section.title }}
          </h2>
          <RouterLink
            v-if="section.items.length > 0 && section.link"
            :to="section.link"
          >
            <Button
              variant="ghost"
              size="sm"
            >
              Lihat semua
            </Button>
          </RouterLink>
        </div>

        <div
          v-if="section.items.length === 0"
          class="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"
        >
          Belum ada {{ section.title.toLowerCase() }}.
        </div>

        <div
          v-else
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <template v-if="section.kind === 'agenda'">
            <AgendaCard
              v-for="item in section.items as PublicAgendaEntry[]"
              :key="item.id"
              :entry="item"
            />
          </template>
          <template v-else>
            <PostCard
              v-for="item in section.items as PostSummary[]"
              :key="item.id"
              :post="item"
            />
          </template>
        </div>
      </section>
    </template>
  </div>
</template>
