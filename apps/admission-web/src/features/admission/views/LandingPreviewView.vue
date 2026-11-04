<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'
import LandingView from './LandingView.vue'

const router = useRouter()
</script>

<template>
  <LandingView mode="draft">
    <template #banner-action>
      <Button
        type="button"
        size="sm"
        variant="outline"
        class="bg-white"
        @click="router.push('/admin/landing')"
      >
        Kembali ke pengaturan
      </Button>
    </template>
  </LandingView>
</template>
