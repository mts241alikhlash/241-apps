<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoleGuard } from '@/features/platform/auth'
import { DashboardView } from '@/features/platform/dashboard'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@mts241alikhlash/ui/tabs'
import { AlertCircle, LayoutDashboard } from '@lucide/vue'
import StudentDashboard from '../components/StudentDashboard.vue'
import EmployeeDashboard from '../components/EmployeeDashboard.vue'
import { useMyDashboard } from '../composables/useMyDashboard'
import { selectDashboardPanels } from '../logic/selectDashboardPanels'

const { can } = useRoleGuard()
const { dashboard, loading, loadError, loaded, fetchMyDashboard } =
  useMyDashboard()

const canReadOwn = computed(() => can('dashboards.read-own'))
const canReadInstitution = computed(() => can('dashboards.read'))

const needsPersonal = computed(
  () => canReadOwn.value && !canReadInstitution.value,
)

const student = computed(() => dashboard.value?.student ?? null)
const employee = computed(() => dashboard.value?.employee ?? null)
const isWeeklyHoliday = computed(
  () => dashboard.value?.today.isWeeklyHoliday ?? false,
)
const todayDate = computed(() => dashboard.value?.today.date ?? undefined)

const panels = computed(() =>
  selectDashboardPanels(dashboard.value, canReadInstitution.value),
)

const defaultPanel = computed(() => panels.value[0]?.value ?? '')

const isDeciding = computed(
  () => needsPersonal.value && (loading.value || !loaded.value),
)

onMounted(() => {
  if (!needsPersonal.value) return
  void fetchMyDashboard()
})
</script>

<template>
  <div>
    <template v-if="!needsPersonal">
      <DashboardView />
    </template>

    <div
      v-else
      class="space-y-6 p-4 sm:p-6"
    >
      <Card
        gap="none"
        class="overflow-hidden"
      >
        <CardHeader standard>
          <div>
            <CardTitle size="lg"> Dashboard </CardTitle>
          </div>
        </CardHeader>

        <CardContent
          variant="standard"
          class="space-y-6"
        >
          <div
            v-if="isDeciding"
            class="space-y-6"
          >
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton
                v-for="i in 3"
                :key="i"
                class="h-[84px] w-full rounded-lg"
              />
            </div>
            <div class="grid gap-4 lg:grid-cols-2">
              <Skeleton class="h-64 w-full rounded-lg" />
              <Skeleton class="h-64 w-full rounded-lg" />
            </div>
          </div>

          <template v-else>
            <Alert
              v-if="loadError"
              variant="destructive"
            >
              <AlertCircle class="size-4" />
              <AlertDescription>{{ loadError }}</AlertDescription>
            </Alert>

            <div
              v-if="panels.length === 0"
              class="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground"
            >
              <LayoutDashboard class="size-10 opacity-40" />
              <p class="text-sm">Belum ada dashboard untuk akun Anda.</p>
            </div>

            <template v-else-if="panels.length === 1">
              <StudentDashboard
                v-if="defaultPanel === 'student' && student"
                :data="student"
                :is-weekly-holiday="isWeeklyHoliday"
                :loading="loading"
              />
              <EmployeeDashboard
                v-else-if="defaultPanel === 'employee' && employee"
                :data="employee"
                :is-weekly-holiday="isWeeklyHoliday"
                :loading="loading"
                :today-date="todayDate"
              />
            </template>

            <Tabs
              v-else
              :default-value="defaultPanel"
            >
              <TabsList>
                <TabsTrigger
                  v-for="panel in panels"
                  :key="panel.value"
                  :value="panel.value"
                >
                  {{ panel.label }}
                </TabsTrigger>
              </TabsList>

              <TabsContent
                v-if="student"
                value="student"
                class="mt-4"
              >
                <StudentDashboard
                  :data="student"
                  :is-weekly-holiday="isWeeklyHoliday"
                  :loading="loading"
                />
              </TabsContent>
              <TabsContent
                v-if="employee"
                value="employee"
                class="mt-4"
              >
                <EmployeeDashboard
                  :data="employee"
                  :is-weekly-holiday="isWeeklyHoliday"
                  :loading="loading"
                  :today-date="todayDate"
                />
              </TabsContent>
            </Tabs>
          </template>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
