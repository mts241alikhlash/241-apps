<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'

const props = defineProps<{
  page: number
  total: number
  limit: number
}>()

const route = useRoute()
const router = useRouter()

const totalPages = computed(() =>
  props.limit > 0 ? Math.ceil(props.total / props.limit) : 1,
)

function goTo(next: number) {
  if (next < 1 || next > totalPages.value) return
  void router.push({ query: { ...route.query, page: String(next) } })
}
</script>

<template>
  <nav
    v-if="totalPages > 1"
    class="flex items-center justify-center gap-4"
    aria-label="Navigasi halaman"
  >
    <Button
      variant="outline"
      size="sm"
      :disabled="page <= 1"
      @click="goTo(page - 1)"
    >
      Sebelumnya
    </Button>
    <span class="text-sm text-muted-foreground">
      Halaman {{ page }} dari {{ totalPages }}
    </span>
    <Button
      variant="outline"
      size="sm"
      :disabled="page >= totalPages"
      @click="goTo(page + 1)"
    >
      Berikutnya
    </Button>
  </nav>
</template>
