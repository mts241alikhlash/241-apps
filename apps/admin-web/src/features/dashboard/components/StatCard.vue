<script setup lang="ts">
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from '@mts241alikhlash/ui/card'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'
import { RotateCw, TriangleAlert } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import type { Component } from 'vue'

defineProps<{
  title: string
  icon: Component
  value: number | undefined
  isPending: boolean
  isError: boolean
  isFetching: boolean
  onRetry: () => void
}>()
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between pb-2">
      <CardDescription class="font-medium">
        {{ title }}
      </CardDescription>
      <component
        :is="icon"
        class="size-4 text-muted-foreground"
      />
    </CardHeader>
    <CardContent>
      <Skeleton
        v-if="isPending"
        class="h-8 w-20"
      />

      <div
        v-else-if="isError"
        class="flex items-center gap-2"
      >
        <TriangleAlert class="size-4 text-destructive" />
        <span class="text-sm text-muted-foreground">
          {{ $t('dashboard.unavailable') }}
        </span>
        <Button
          size="sm"
          variant="ghost"
          @click="onRetry"
        >
          <RotateCw class="size-3" />
        </Button>
      </div>

      <div
        v-else
        class="flex items-baseline gap-2"
      >
        <span class="text-3xl font-semibold tabular-nums">{{ value }}</span>
        <span
          v-if="isFetching"
          class="text-xs text-muted-foreground"
        >
          {{ $t('dashboard.refreshing') }}
        </span>
      </div>
    </CardContent>
  </Card>
</template>
