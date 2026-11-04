<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { KeyRound, ScrollText, Shield, Users } from '@lucide/vue'
import StatCard from '../components/StatCard.vue'
import { dashboardApi } from '../api/dashboardApi'

const FIVE_MINUTES = 5 * 60 * 1000

const users = useQuery({
  queryKey: ['dashboard', 'users'],
  queryFn: dashboardApi.users,
  select: (s) => s.total,
  staleTime: FIVE_MINUTES,
})
const roles = useQuery({
  queryKey: ['dashboard', 'roles'],
  queryFn: dashboardApi.roleCount,
  staleTime: FIVE_MINUTES,
})
const permissions = useQuery({
  queryKey: ['dashboard', 'permissions'],
  queryFn: dashboardApi.permissionCount,
  staleTime: FIVE_MINUTES,
})
const auditLogs = useQuery({
  queryKey: ['dashboard', 'audit-logs'],
  queryFn: dashboardApi.auditLogs,
  select: (s) => s.since,
  staleTime: FIVE_MINUTES,
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">{{ $t('dashboard.title') }}</h1>
      <p class="text-sm text-muted-foreground">
        {{ $t('dashboard.subtitle') }}
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        :title="$t('dashboard.users')"
        :icon="Users"
        :value="users.data.value"
        :is-pending="users.isPending.value"
        :is-error="users.isError.value"
        :is-fetching="users.isFetching.value"
        :on-retry="() => void users.refetch()"
      />
      <StatCard
        :title="$t('dashboard.roles')"
        :icon="Shield"
        :value="roles.data.value"
        :is-pending="roles.isPending.value"
        :is-error="roles.isError.value"
        :is-fetching="roles.isFetching.value"
        :on-retry="() => void roles.refetch()"
      />
      <StatCard
        :title="$t('dashboard.permissions')"
        :icon="KeyRound"
        :value="permissions.data.value"
        :is-pending="permissions.isPending.value"
        :is-error="permissions.isError.value"
        :is-fetching="permissions.isFetching.value"
        :on-retry="() => void permissions.refetch()"
      />
      <StatCard
        :title="$t('dashboard.auditLast24h')"
        :icon="ScrollText"
        :value="auditLogs.data.value"
        :is-pending="auditLogs.isPending.value"
        :is-error="auditLogs.isError.value"
        :is-fetching="auditLogs.isFetching.value"
        :on-retry="() => void auditLogs.refetch()"
      />
    </div>
  </div>
</template>
