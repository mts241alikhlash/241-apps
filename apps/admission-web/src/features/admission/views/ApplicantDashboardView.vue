<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@mts241alikhlash/ui/alert'
import { Progress } from '@mts241alikhlash/ui/progress'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'
import { Separator } from '@mts241alikhlash/ui/separator'
import { ScrollArea } from '@mts241alikhlash/ui/scroll-area'
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
} from '@mts241alikhlash/ui/stepper'
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Check,
  CircleDashed,
  FileWarning,
  Megaphone,
  PartyPopper,
  TriangleAlert,
  Wallet,
  XCircle,
} from '@lucide/vue'
import { useMyApplication } from '../composables/useMyApplication'
import { useRoleGuard } from '@/features/platform/auth'
import StatusBadge from '../components/StatusBadge.vue'
import type { AdmissionStatus } from '../types'
import { PAYMENT_STATUS_LABELS, STATUS_LABELS } from '../types'
import { lateDocumentReminders } from '../composables/lateDocumentReminders'
import { formatDateTime, formatIDR, formatJakartaDate } from '../utils'

const {
  application,
  notifications,
  unreadCount,
  announcements,
  loading,
  dashboardError,
  notificationsError,
  announcementsError,
  fetchDashboard,
  markAllRead,
} = useMyApplication()

const { can } = useRoleGuard()

const isAdmin = computed(() => can('admissions.read'))

const NEXT_ACTION: Record<AdmissionStatus, string> = {
  DRAFT: 'Silakan lengkapi formulir pendaftaran.',
  REVISION_NEEDED: 'Formulir perlu diperbaiki sesuai catatan panitia.',
  SUBMITTED: 'Formulir sedang diverifikasi oleh panitia.',
  VERIFIED: 'Data telah terverifikasi. Mohon menunggu hasil seleksi.',
  ACCEPTED: 'Anda dinyatakan diterima. Mohon menunggu proses daftar ulang.',
  ENROLLING: 'Data Anda sedang diproses sebagai santri baru.',
  ENROLLED: 'Pendaftaran selesai. Anda resmi terdaftar sebagai santri.',
  REJECTED: 'Pendaftaran Anda belum dapat diterima.',
}
const nextAction = computed(() =>
  application.value ? NEXT_ACTION[application.value.status] : '',
)

const TIMELINE: {
  status: AdmissionStatus
  label: string
  description: string
}[] = [
  {
    status: 'DRAFT',
    label: 'Pengisian',
    description: 'Formulir dan berkas',
  },
  {
    status: 'SUBMITTED',
    label: 'Verifikasi',
    description: 'Pemeriksaan panitia',
  },
  {
    status: 'VERIFIED',
    label: 'Terverifikasi',
    description: 'Data dinyatakan sah',
  },
  {
    status: 'ACCEPTED',
    label: 'Diterima',
    description: 'Hasil seleksi',
  },
  {
    status: 'ENROLLED',
    label: 'Santri',
    description: 'Daftar ulang selesai',
  },
]

const currentStep = computed(() => {
  const status = application.value?.status
  if (!status || status === 'REVISION_NEEDED') return 1
  if (status === 'ENROLLING') return TIMELINE.length
  if (status === 'REJECTED') return 3
  return TIMELINE.findIndex((step) => step.status === status) + 1
})

const editable = computed(
  () =>
    application.value?.status === 'DRAFT' ||
    application.value?.status === 'REVISION_NEEDED',
)

const requiredDocs = computed(() => {
  const app = application.value
  if (!app) return { done: 0, total: 0 }
  const required = (app.documentTypes ?? []).filter(
    (type) => type.requirement === 'REQUIRED',
  )
  const done = required.filter((type) =>
    (app.documents ?? []).some(
      (doc) => doc.documentTypeId === type.id && doc.status !== 'REJECTED',
    ),
  ).length
  return { done, total: required.length }
})

const reminders = computed(() => {
  const app = application.value
  if (!app || app.status === 'REJECTED' || editable.value) return []
  return lateDocumentReminders(app.documentTypes ?? [], app.documents ?? [])
})

const docProgress = computed(() =>
  requiredDocs.value.total
    ? Math.round((requiredDocs.value.done / requiredDocs.value.total) * 100)
    : 100,
)

interface Task {
  key: string
  title: string
  detail?: string | null
  icon: typeof AlertCircle
  step?: 'documents' | 'payment'
}

const tasks = computed<Task[]>(() => {
  const app = application.value
  if (!app) return []
  const list: Task[] = []
  if (app.status === 'DRAFT') {
    list.push({
      key: 'form',
      title: 'Lengkapi dan kirim formulir pendaftaran',
      icon: AlertCircle,
    })
  }
  if (app.status === 'REVISION_NEEDED') {
    list.push({
      key: 'revise',
      title: 'Perbaiki formulir sesuai catatan panitia',
      detail: app.revisionNote,
      icon: AlertCircle,
    })
  }
  if (editable.value) {
    for (const type of app.documentTypes ?? []) {
      const document = (app.documents ?? []).find(
        (doc) => doc.documentTypeId === type.id,
      )
      if (document?.status === 'REJECTED') {
        list.push({
          key: `doc-${type.id}`,
          step: 'documents',
          title: `Unggah ulang ${type.name}`,
          detail: document.note,
          icon: FileWarning,
        })
      }
    }
  }
  const payment = app.payment
  if (
    payment &&
    payment.amount > 0 &&
    ['DRAFT', 'SUBMITTED', 'REVISION_NEEDED'].includes(app.status) &&
    (payment.status === 'UNPAID' || payment.status === 'REJECTED')
  ) {
    list.push({
      key: 'payment',
      step: 'payment',
      title:
        payment.status === 'REJECTED'
          ? 'Unggah ulang bukti pembayaran'
          : 'Unggah bukti pembayaran',
      detail: payment.note ?? `Biaya pendaftaran ${formatIDR(payment.amount)}`,
      icon: Wallet,
    })
  }
  return list
})

onMounted(() => {
  void fetchDashboard()
})
</script>

<template>
  <div
    v-if="loading"
    class="space-y-4 p-4 sm:p-6"
    aria-busy="true"
  >
    <span class="sr-only">Memuat data pendaftaran…</span>
    <Skeleton class="h-40 w-full rounded-xl" />
    <div class="grid gap-4 lg:grid-cols-2">
      <Skeleton class="h-48 rounded-xl" />
      <Skeleton class="h-48 rounded-xl" />
    </div>
  </div>

  <div
    v-else-if="dashboardError === 'load-failed'"
    class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2"
  >
    <Alert variant="destructive">
      <XCircle />
      <AlertTitle>Data pendaftaran gagal dimuat.</AlertTitle>
      <AlertDescription>
        <Button
          variant="outline"
          class="mt-2"
          @click="fetchDashboard()"
          >Coba lagi</Button
        >
      </AlertDescription>
    </Alert>
  </div>

  <div
    v-else-if="application"
    class="space-y-6 p-4 sm:p-6"
  >
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader
        standard
        class="flex-wrap"
      >
        <div class="min-w-0 space-y-1">
          <CardTitle
            size="lg"
            class="break-words"
          >
            {{ application.fullName }}
          </CardTitle>
          <CardDescription>
            No. Pendaftaran
            <span class="tabular-nums font-medium text-foreground">
              {{ application.registrationNumber }}
            </span>
            · {{ application.wave?.name }}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent class="space-y-6 px-4 py-5 sm:px-6">
        <StatusBadge :status="application.status" />
        <p class="text-base font-medium">{{ nextAction }}</p>

        <Alert
          v-if="application.waveIsFull"
          variant="destructive"
        >
          <TriangleAlert />
          <AlertTitle>Gelombang penuh</AlertTitle>
          <AlertDescription>
            Gelombang ini sudah penuh. Anda akan dipindahkan ke gelombang
            berikutnya begitu dibuka.
          </AlertDescription>
        </Alert>
        <Alert
          v-if="application.status === 'REVISION_NEEDED'"
          variant="destructive"
        >
          <AlertCircle />
          <AlertTitle>Formulir perlu diperbaiki</AlertTitle>
          <AlertDescription>
            Catatan panitia: {{ application.revisionNote }}
          </AlertDescription>
        </Alert>
        <Alert
          v-else-if="application.status === 'REJECTED'"
          variant="destructive"
        >
          <XCircle />
          <AlertTitle>
            Mohon maaf, pendaftaran Anda belum dapat diterima.
          </AlertTitle>
          <AlertDescription v-if="application.decisionNote">
            Alasan: {{ application.decisionNote }}
          </AlertDescription>
        </Alert>
        <Alert
          v-else-if="
            application.status === 'ACCEPTED' ||
            application.status === 'ENROLLED'
          "
          class="border-primary/50"
        >
          <PartyPopper class="text-primary" />
          <AlertTitle class="text-primary">
            Selamat, Anda dinyatakan
            {{ STATUS_LABELS[application.status].toLowerCase() }}.
          </AlertTitle>
          <AlertDescription v-if="application.decisionNote">
            {{ application.decisionNote }}
          </AlertDescription>
        </Alert>

        <Button
          v-if="editable"
          as-child
        >
          <RouterLink to="/registration/form">
            Lanjutkan Pengisian Formulir
            <ArrowRight class="ml-1 size-4" />
          </RouterLink>
        </Button>
        <Button
          v-else-if="tasks.some((task) => task.key === 'payment')"
          as-child
          variant="outline"
          class="min-h-11"
        >
          <RouterLink
            :to="{ path: '/registration/form', query: { step: 'payment' } }"
          >
            Unggah Bukti Pembayaran
            <ArrowRight class="ml-1 size-4" />
          </RouterLink>
        </Button>

        <section
          v-if="reminders.length"
          data-test="late-reminders"
          class="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-[length:var(--text-control,0.75rem)] text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <h2 class="font-medium">Berkas yang masih harus diserahkan</h2>
          <ul class="list-disc space-y-1 pl-5">
            <li
              v-for="reminder in reminders"
              :key="reminder.name"
            >
              {{ reminder.name
              }}<template v-if="reminder.dueDate">
                , paling lambat
                {{ formatJakartaDate(reminder.dueDate) }}</template
              ><template v-else>, sesuai pemberitahuan sekolah</template>
              <span v-if="reminder.note"> ({{ reminder.note }})</span>
            </li>
          </ul>
          <p>Serahkan ke TU sekolah. TU yang mengunggah dan memeriksanya.</p>
        </section>

        <template v-if="tasks.length">
          <Separator />
          <section class="space-y-3">
            <h2 class="font-medium">Langkah yang perlu diselesaikan</h2>
            <ul class="space-y-2">
              <li
                v-for="task in tasks"
                :key="task.key"
                class="flex items-start gap-3 rounded-lg border p-3 text-[length:var(--text-control,0.75rem)]"
              >
                <component
                  :is="task.icon"
                  class="mt-0.5 size-4 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <div class="min-w-0 flex-1">
                  <RouterLink
                    :to="
                      task.step
                        ? {
                            path: '/registration/form',
                            query: { step: task.step },
                          }
                        : '/registration/form'
                    "
                    class="inline-flex min-h-11 items-center font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {{ task.title }}
                  </RouterLink>
                  <p
                    v-if="task.detail"
                    class="break-words text-muted-foreground"
                  >
                    {{ task.detail }}
                  </p>
                </div>
              </li>
            </ul>
          </section>
        </template>

        <details class="sm:hidden">
          <summary
            class="flex min-h-11 cursor-pointer items-center font-medium"
          >
            Tahapan pendaftaran
          </summary>
          <ol
            class="space-y-3 border-l-2 border-muted pl-4 text-[length:var(--text-control,0.75rem)]"
          >
            <li
              v-for="(step, index) in TIMELINE"
              :key="step.status"
            >
              <span
                :class="
                  index + 1 <= currentStep
                    ? 'font-medium text-primary'
                    : 'text-muted-foreground'
                "
                >{{ step.label }}</span
              >
              <p class="text-muted-foreground">{{ step.description }}</p>
            </li>
          </ol>
        </details>

        <Stepper
          :model-value="currentStep"
          class="hidden w-full items-start gap-1 sm:flex sm:gap-2"
          aria-label="Tahapan pendaftaran"
        >
          <StepperItem
            v-for="(step, index) in TIMELINE"
            :key="step.status"
            :step="index + 1"
            class="relative flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
          >
            <StepperSeparator
              v-if="index < TIMELINE.length - 1"
              class="absolute top-4 left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] block h-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary"
            />
            <StepperIndicator
              class="z-10 group-data-[state=completed]:bg-primary group-data-[state=completed]:text-primary-foreground"
            >
              <Check
                v-if="index + 1 < currentStep"
                class="size-4"
              />
              <span v-else>{{ index + 1 }}</span>
            </StepperIndicator>
            <div>
              <StepperTitle
                class="text-xs font-medium sm:text-[length:var(--text-control,0.75rem)]"
              >
                {{ step.label }}
              </StepperTitle>
              <StepperDescription
                class="hidden text-xs text-muted-foreground sm:block"
              >
                {{ step.description }}
              </StepperDescription>
            </div>
          </StepperItem>
        </Stepper>

        <div class="grid gap-3 sm:grid-cols-3">
          <div
            class="space-y-2 rounded-lg border p-4 text-[length:var(--text-control,0.75rem)]"
          >
            <p class="text-muted-foreground">Kelengkapan Berkas</p>
            <p class="font-medium">
              {{ requiredDocs.done }} dari {{ requiredDocs.total }} berkas
            </p>
            <Progress
              :model-value="docProgress"
              class="h-2"
              aria-label="Kelengkapan berkas"
            />
          </div>
          <div
            class="space-y-1 rounded-lg border p-4 text-[length:var(--text-control,0.75rem)]"
          >
            <p class="text-muted-foreground">Pembayaran</p>
            <p
              v-if="application.payment && application.payment.amount === 0"
              class="font-medium"
            >
              Tanpa biaya
            </p>
            <p
              v-else
              class="font-medium"
            >
              {{
                application.payment
                  ? PAYMENT_STATUS_LABELS[application.payment.status]
                  : '-'
              }}
            </p>
            <p
              v-if="application.payment && application.payment.amount > 0"
              class="text-muted-foreground"
            >
              {{ formatIDR(application.payment.amount) }}
            </p>
          </div>
          <div
            class="space-y-1 rounded-lg border p-4 text-[length:var(--text-control,0.75rem)]"
          >
            <p class="text-muted-foreground">Tanggal Pengiriman</p>
            <p class="font-medium">
              {{
                application.submittedAt
                  ? formatDateTime(application.submittedAt)
                  : 'Belum dikirim'
              }}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <div class="grid gap-6 lg:grid-cols-2">
      <Card
        gap="none"
        class="overflow-hidden"
      >
        <CardHeader standard>
          <CardTitle
            size="md"
            class="flex items-center gap-2"
          >
            <Bell class="size-4" />
            Notifikasi
            <Badge
              v-if="unreadCount > 0"
              variant="destructive"
            >
              {{ unreadCount }}
            </Badge>
          </CardTitle>
          <Button
            v-if="unreadCount > 0"
            variant="ghost"
            size="sm"
            @click="markAllRead"
          >
            Tandai semua dibaca
          </Button>
        </CardHeader>
        <CardContent class="p-0">
          <div
            v-if="notificationsError"
            class="space-y-2 p-4 text-[length:var(--text-control,0.75rem)]"
          >
            <p>Notifikasi gagal dimuat.</p>
            <Button
              variant="outline"
              @click="fetchDashboard()"
              >Coba lagi</Button
            >
          </div>
          <p
            v-else-if="notifications.length === 0"
            class="flex items-center gap-2 p-4 text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            <CircleDashed class="size-4" />
            Belum ada notifikasi.
          </p>
          <ScrollArea
            v-else
            class="max-h-96"
          >
            <ul class="divide-y">
              <li
                v-for="notification in notifications"
                :key="notification.id"
                class="space-y-1 p-4 text-[length:var(--text-control,0.75rem)]"
                :class="notification.readAt ? 'opacity-70' : 'bg-primary/5'"
              >
                <p class="flex items-center gap-2 font-medium">
                  <span
                    v-if="!notification.readAt"
                    class="size-2 shrink-0 rounded-full bg-primary"
                    aria-label="Belum dibaca"
                  />
                  {{ notification.title }}
                </p>
                <p class="whitespace-pre-line text-muted-foreground">
                  {{ notification.message }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ formatDateTime(notification.createdAt) }}
                </p>
              </li>
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card
        gap="none"
        class="overflow-hidden"
      >
        <CardHeader standard>
          <div class="flex items-center gap-3">
            <CardTitle
              size="md"
              class="flex items-center gap-2"
            >
              <Megaphone class="size-4" />
              Pengumuman
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent class="p-0">
          <div
            v-if="announcementsError"
            class="space-y-2 p-4 text-[length:var(--text-control,0.75rem)]"
          >
            <p>Pengumuman gagal dimuat.</p>
            <Button
              variant="outline"
              @click="fetchDashboard()"
              >Coba lagi</Button
            >
          </div>
          <p
            v-else-if="announcements.length === 0"
            class="flex items-center gap-2 p-4 text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            <CircleDashed class="size-4" />
            Belum ada pengumuman dari panitia.
          </p>
          <ScrollArea
            v-else
            class="max-h-96"
          >
            <ul class="divide-y">
              <li
                v-for="announcement in announcements"
                :key="announcement.id"
                class="space-y-1 p-4 text-[length:var(--text-control,0.75rem)]"
              >
                <p class="font-medium">{{ announcement.title }}</p>
                <p class="whitespace-pre-line text-muted-foreground">
                  {{ announcement.content }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ formatDateTime(announcement.publishedAt) }}
                  <span v-if="announcement.wave">
                    · {{ announcement.wave.name }}
                  </span>
                </p>
              </li>
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  </div>

  <div
    v-else
    class="flex min-h-[60vh] items-center justify-center p-6"
  >
    <Card class="w-full max-w-md text-center">
      <CardContent class="space-y-4 p-8">
        <CircleDashed class="mx-auto size-8 text-muted-foreground" />
        <h2 class="text-lg font-medium tracking-tight">
          Belum ada data pendaftaran
        </h2>
        <p
          class="text-[length:var(--text-control,0.75rem)] text-balance text-muted-foreground"
        >
          {{
            isAdmin
              ? 'Akun ini adalah akun admin, sehingga tidak memiliki formulir pendaftaran pribadi.'
              : 'Akun Anda belum terhubung ke formulir pendaftaran. Hubungi panitia penerimaan untuk bantuan.'
          }}
        </p>
        <Button
          v-if="isAdmin"
          as-child
        >
          <RouterLink to="/admin/applicants">Buka Daftar Pendaftar</RouterLink>
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
