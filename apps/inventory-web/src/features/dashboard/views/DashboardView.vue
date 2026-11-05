<script setup lang="ts">
import { computed } from 'vue'
import { useRoleGuard } from '@mts241alikhlash/platform/auth'
import AssetSummaryCard from '../components/AssetSummaryCard.vue'
import LoanSummaryCard from '../components/LoanSummaryCard.vue'
import PendingApprovalsCard from '../components/PendingApprovalsCard.vue'

const { can } = useRoleGuard()

const showAssets = computed(() => can('inventory-assets.read'))
const showLoans = computed(() => can('inventory-loans.read'))
const showApprovals = computed(() => can('inventory-approvals.read'))
</script>

<template>
  <div class="space-y-6 px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <AssetSummaryCard v-if="showAssets" />
      <LoanSummaryCard v-if="showLoans" />
      <PendingApprovalsCard v-if="showApprovals" />
    </div>
    <p
      v-if="!showAssets && !showLoans && !showApprovals"
      class="text-muted-foreground"
    >
      Belum ada ringkasan untuk akun ini.
    </p>
  </div>
</template>
