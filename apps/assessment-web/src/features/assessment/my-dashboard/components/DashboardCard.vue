<script setup lang="ts">
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'

defineProps<{
  title: string
  loading: boolean
  error: boolean
  empty?: boolean
  emptyText?: string
}>()
</script>

<template>
  <Card gap="none">
    <CardHeader standard>
      <CardTitle size="md">{{ title }}</CardTitle>
    </CardHeader>
    <CardContent variant="standard">
      <Skeleton
        v-if="loading"
        class="h-8 w-24"
        data-testid="card-loading"
      />
      <p
        v-else-if="error"
        class="text-destructive"
        data-testid="card-error"
      >
        Gagal memuat data.
      </p>
      <p
        v-else-if="empty"
        class="text-muted-foreground"
        data-testid="card-empty"
      >
        {{ emptyText ?? 'Belum ada data.' }}
      </p>
      <slot v-else />
    </CardContent>
  </Card>
</template>
