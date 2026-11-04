<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Loader2 } from '@lucide/vue'
import { NotFoundView } from '@/features/platform/auth'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'
import { Separator } from '@mts241alikhlash/ui/separator'
import { pageService } from '../services/pageService'
import { usePageStore } from '../stores/pageStore'
import { SafeHtml } from '@mts241alikhlash/ui'

const route = useRoute()
const store = usePageStore()

const slug = computed(() => String(route.params.pageSlug ?? ''))

watch(
  slug,
  () => {
    if (slug.value) void pageService.fetchPublic(slug.value)
  },
  { immediate: true },
)
</script>

<template>
  <div
    v-if="store.loading"
    class="space-y-6"
  >
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 class="size-4 animate-spin" />
      Memuat…
    </div>
    <Skeleton class="h-9 w-2/3" />
    <Skeleton class="h-px w-full" />
    <div class="space-y-2">
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-3/4" />
    </div>
  </div>

  <NotFoundView v-else-if="store.notFound" />

  <div
    v-else-if="store.unavailable"
    class="rounded-lg border border-dashed p-8 text-center text-muted-foreground"
  >
    Halaman sedang tidak dapat dimuat. Silakan coba beberapa saat lagi.
  </div>

  <article
    v-else-if="store.publicPage"
    class="space-y-8"
  >
    <h1 class="text-3xl font-bold leading-tight tracking-tight">
      {{ store.publicPage.title }}
    </h1>

    <Separator />

    <SafeHtml
      class="prose prose-neutral max-w-none dark:prose-invert"
      :html="store.publicPage.body"
    />
  </article>
</template>
