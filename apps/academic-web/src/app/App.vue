<script setup lang="ts">
import 'vue-sonner/style.css'
import { ErrorBoundary } from '@mts241alikhlash/ui'
import { Toaster } from '@mts241alikhlash/ui/sonner'
</script>

<template>
  <ErrorBoundary>
    <router-view />
  </ErrorBoundary>
  <Toaster
    rich-colors
    position="bottom-right"
  />
</template>
