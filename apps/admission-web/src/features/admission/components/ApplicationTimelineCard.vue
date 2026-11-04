<script setup lang="ts">
import { computed } from 'vue'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Check, X, Info, AlertCircle } from '@lucide/vue'
import type { AdmissionApplication } from '../types'
import { formatDateTime } from '../utils'

const props = defineProps<{
  application: AdmissionApplication
}>()

interface TimelineEvent {
  key: string
  title: string
  time?: string | null
  description: string
  note?: string | null
  state: 'complete' | 'current' | 'upcoming' | 'rejected'
}

const events = computed<TimelineEvent[]>(() => {
  const app = props.application
  const status = app.status

  const isSubmitted = !!app.submittedAt
  const isVerified = ['VERIFIED', 'ACCEPTED', 'ENROLLING', 'ENROLLED'].includes(
    status,
  )
  const isRevision = status === 'REVISION_NEEDED'
  const isAccepted = ['ACCEPTED', 'ENROLLING', 'ENROLLED'].includes(status)
  const isRejected = status === 'REJECTED'
  const isEnrolled = status === 'ENROLLED'
  const isEnrolling = status === 'ENROLLING'

  const items: TimelineEvent[] = []

  items.push({
    key: 'created',
    title: 'Akun & Formulir Dibuat',
    time: app.createdAt ? formatDateTime(app.createdAt) : null,
    description: 'Pendaftar memulai pengisian formulir di sistem.',
    state: 'complete',
  })

  if (isSubmitted) {
    items.push({
      key: 'submitted',
      title: 'Formulir Dikirim',
      time: formatDateTime(app.submittedAt),
      description: 'Data dan berkas telah diserahkan untuk proses verifikasi.',
      state: 'complete',
    })
  } else {
    items.push({
      key: 'submitted',
      title: 'Pengiriman Formulir',
      time: null,
      description: 'Formulir pendaftaran belum dikirim oleh calon santri.',
      state: 'current',
    })
  }

  if (isVerified) {
    items.push({
      key: 'verified',
      title: 'Verifikasi Berkas & Pembayaran',
      time: app.verifiedAt ? formatDateTime(app.verifiedAt) : null,
      description:
        'Seluruh berkas persyaratan dan konfirmasi pembayaran telah disetujui panitia.',
      state: 'complete',
    })
  } else if (isRevision) {
    items.push({
      key: 'verified',
      title: 'Perlu Perbaikan Berkas',
      time: null,
      description:
        'Panitia meminta pendaftar memperbaiki atau mengunggah ulang dokumen.',
      note: app.revisionNote ? `Catatan: ${app.revisionNote}` : null,
      state: 'rejected',
    })
  } else if (isSubmitted) {
    items.push({
      key: 'verified',
      title: 'Pemeriksaan Berkas & Pembayaran',
      time: null,
      description:
        'Sedang dalam antrean pemeriksaan berkas atau verifikasi pembayaran oleh panitia.',
      state: 'current',
    })
  } else {
    items.push({
      key: 'verified',
      title: 'Pemeriksaan Berkas & Pembayaran',
      time: null,
      description: 'Menunggu pengiriman formulir sebelum diperiksa.',
      state: 'upcoming',
    })
  }

  if (isAccepted) {
    items.push({
      key: 'decision',
      title: 'Keputusan: Diterima',
      time: app.decidedAt ? formatDateTime(app.decidedAt) : null,
      description: 'Calon santri dinyatakan lulus seleksi dan diterima.',
      note: app.decisionNote ? `Catatan: ${app.decisionNote}` : null,
      state: 'complete',
    })
  } else if (isRejected) {
    items.push({
      key: 'decision',
      title: 'Keputusan: Ditolak',
      time: app.decidedAt ? formatDateTime(app.decidedAt) : null,
      description: 'Pendaftaran tidak dapat diterima pada periode ini.',
      note: app.decisionNote ? `Catatan: ${app.decisionNote}` : null,
      state: 'rejected',
    })
  } else if (isVerified) {
    items.push({
      key: 'decision',
      title: 'Keputusan Pendaftaran',
      time: null,
      description:
        'Berkas telah lengkap. Menunggu penetapan keputusan pimpinan madrasah.',
      state: 'current',
    })
  } else {
    items.push({
      key: 'decision',
      title: 'Keputusan Pendaftaran',
      time: null,
      description:
        'Keputusan akan ditetapkan setelah tahap verifikasi selesai.',
      state: 'upcoming',
    })
  }

  if (isEnrolled) {
    items.push({
      key: 'enrolled',
      title: 'Daftar Ulang Selesai',
      time: app.enrolledAt ? formatDateTime(app.enrolledAt) : null,
      description: app.nis
        ? `Resmi terdaftar sebagai santri aktif dengan NIS ${app.nis}.`
        : 'Resmi diproses dan terdaftar sebagai santri aktif.',
      state: 'complete',
    })
  } else if (isEnrolling) {
    items.push({
      key: 'enrolled',
      title: 'Proses Daftar Ulang',
      time: null,
      description: 'Sedang dalam penomoran NIS dan administrasi daftar ulang.',
      state: 'current',
    })
  } else if (isAccepted) {
    items.push({
      key: 'enrolled',
      title: 'Daftar Ulang',
      time: null,
      description: 'Calon santri siap diproses daftar ulang dan penomoran NIS.',
      state: 'current',
    })
  } else if (!isRejected) {
    items.push({
      key: 'enrolled',
      title: 'Daftar Ulang',
      time: null,
      description:
        'Tahap penomoran NIS dan registrasi santri setelah diterima.',
      state: 'upcoming',
    })
  }

  return items
})

const eventsWithNote = computed(() => events.value.filter((e) => !!e.note))

function circleClass(state: TimelineEvent['state']) {
  switch (state) {
    case 'complete':
      return 'border-primary bg-primary text-primary-foreground'
    case 'current':
      return 'border-2 border-primary bg-background text-primary ring-2 ring-primary/15 font-semibold shadow-xs'
    case 'rejected':
      return 'border-destructive bg-destructive text-destructive-foreground'
    case 'upcoming':
    default:
      return 'border-2 border-muted bg-muted/40 text-muted-foreground font-medium'
  }
}
</script>

<template>
  <Card
    gap="none"
    data-test="timeline-card"
  >
    <CardHeader standard>
      <CardTitle size="md"> Riwayat & Linimasa Pendaftaran </CardTitle>
    </CardHeader>
    <CardContent variant="standard">
      <div class="overflow-x-auto pb-4 pt-2 [scrollbar-width:thin]">
        <div class="flex min-w-[720px] items-start md:min-w-0 md:w-full">
          <template
            v-for="(event, index) in events"
            :key="event.key"
          >
            <div
              data-test="timeline-event"
              class="flex flex-col items-center text-center"
            >
              <div
                class="flex size-8 shrink-0 items-center justify-center rounded-full text-xs transition-all"
                :class="circleClass(event.state)"
              >
                <Check
                  v-if="event.state === 'complete'"
                  class="size-3.5 stroke-[2.5]"
                />
                <X
                  v-else-if="event.state === 'rejected'"
                  class="size-3.5 stroke-[2.5]"
                />
                <span v-else>{{ index + 1 }}</span>
              </div>

              <div class="mt-3 w-32 sm:w-36 px-1">
                <h4
                  class="text-xs font-medium sm:text-[length:var(--text-control,0.75rem)] leading-snug"
                  :class="
                    event.state === 'rejected'
                      ? 'text-destructive'
                      : 'text-foreground'
                  "
                >
                  {{ event.title }}
                </h4>
                <time
                  v-if="event.time"
                  class="mt-1 block text-[11px] text-muted-foreground tabular-nums"
                >
                  {{ event.time }}
                </time>
                <p
                  class="mt-1 text-[11px] text-muted-foreground line-clamp-2 leading-tight"
                >
                  {{ event.description }}
                </p>
              </div>
            </div>

            <div
              v-if="index < events.length - 1"
              class="mt-4 h-0.5 flex-1 min-w-[24px] sm:min-w-[36px]"
              :class="event.state === 'complete' ? 'bg-primary' : 'bg-muted'"
            />
          </template>
        </div>
      </div>

      <div
        v-for="event in eventsWithNote"
        :key="`note-${event.key}`"
        class="mt-4 rounded-md border p-3 text-[length:var(--text-control,0.75rem)]"
        :class="
          event.state === 'rejected'
            ? 'border-destructive/30 bg-destructive/10 text-destructive'
            : 'border-primary/30 bg-primary/5 text-primary'
        "
      >
        <div class="flex items-start gap-3">
          <AlertCircle
            v-if="event.state === 'rejected'"
            class="size-5 shrink-0 mt-0.5 text-destructive"
          />
          <Info
            v-else
            class="size-5 shrink-0 mt-0.5 text-primary"
          />
          <div class="min-w-0 flex-1">
            <p class="font-medium">{{ event.title }}</p>
            <p class="mt-1 leading-relaxed">{{ event.note }}</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
