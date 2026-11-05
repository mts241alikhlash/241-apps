<script setup lang="ts">
import { computed } from 'vue'
import { useRoleGuard } from '@mts241alikhlash/platform/auth'
import AttendanceTodayCard from '../components/AttendanceTodayCard.vue'
import EmployeeSummaryCard from '../components/EmployeeSummaryCard.vue'
import MyAttendanceCard from '../components/MyAttendanceCard.vue'
import MyLeaveCard from '../components/MyLeaveCard.vue'
import MyPayslipCard from '../components/MyPayslipCard.vue'
import PendingLeavesCard from '../components/PendingLeavesCard.vue'

const { can } = useRoleGuard()

const showMyAttendance = computed(() => can('presence-records.read-own'))
const showMyLeave = computed(
  () => can('presence-records.read-own') && can('leave-requests.read-own'),
)
const showMyPayslip = computed(() => can('payroll-payslips.read-own'))
const showAttendanceToday = computed(() => can('presence-records.read'))
const showEmployees = computed(() => can('employees.read'))
const showPendingLeaves = computed(() => can('leave-requests.read'))

const showMine = computed(
  () => showMyAttendance.value || showMyLeave.value || showMyPayslip.value,
)
const showManagement = computed(
  () =>
    showAttendanceToday.value || showEmployees.value || showPendingLeaves.value,
)
</script>

<template>
  <div class="space-y-6 px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <section
      v-if="showManagement"
      class="space-y-3"
      data-testid="management-section"
    >
      <h2 class="font-semibold">Pengelolaan</h2>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AttendanceTodayCard v-if="showAttendanceToday" />
        <EmployeeSummaryCard v-if="showEmployees" />
        <PendingLeavesCard v-if="showPendingLeaves" />
      </div>
    </section>

    <section
      v-if="showMine"
      class="space-y-3"
      data-testid="mine-section"
    >
      <h2 class="font-semibold">Saya</h2>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MyAttendanceCard v-if="showMyAttendance" />
        <MyLeaveCard v-if="showMyLeave" />
        <MyPayslipCard v-if="showMyPayslip" />
      </div>
    </section>

    <p
      v-if="!showMine && !showManagement"
      class="text-muted-foreground"
    >
      Belum ada ringkasan untuk akun ini.
    </p>
  </div>
</template>
