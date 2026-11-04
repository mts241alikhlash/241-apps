<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoginView from '@/features/platform/auth/views/LoginView.vue'
import SignUpDialog from '../components/SignUpDialog.vue'

const route = useRoute()
const router = useRouter()
const isSignUpOpen = ref(false)

watch(
  () => route.query.signup,
  (signup) => {
    if (signup !== '1') return
    isSignUpOpen.value = true
    const { signup: _signup, ...query } = route.query
    void router.replace({ query })
  },
  { immediate: true },
)
</script>

<template>
  <LoginView />
  <SignUpDialog v-model="isSignUpOpen" />
</template>
