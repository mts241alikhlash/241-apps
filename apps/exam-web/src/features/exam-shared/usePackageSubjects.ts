import { onMounted, ref } from 'vue'
import { examScheduleService } from '@/features/exam-schedule/services/examScheduleService'
import { subjectApi } from '@/features/lookup/subject'

let loaded: Map<string, string> | null = null
let inflight: Promise<Map<string, string>> | null = null

async function fetchMap(): Promise<Map<string, string>> {
  const [packages, subjects] = await Promise.all([
    examScheduleService.loadPackages(),
    subjectApi.getSubjects({ page: 1, limit: 200 }),
  ])
  const names = new Map(subjects.data.map((item) => [item.id, item.name]))
  return new Map(
    packages.flatMap((item) => {
      const name = names.get(item.subjectId)
      return name === undefined ? [] : [[item.id, name] as const]
    }),
  )
}

async function loadMap(): Promise<Map<string, string>> {
  if (loaded !== null) return loaded
  inflight ??= fetchMap()
    .then((map) => {
      loaded = map
      return map
    })
    .catch(() => new Map<string, string>())
    .finally(() => {
      inflight = null
    })
  return inflight
}

export const subjectFromTitle = (title: string): string => {
  const subject = title
    .replace(/^(Paket\s+)?(UAS|UTS|PAS|PTS|UH|Ulangan Harian|Tugas)\s+/i, '')
    .replace(/\s+Kelas\s+\d+.*$/i, '')
    .trim()
  return subject === '' ? title : subject
}

export function usePackageSubjects() {
  const names = ref(loaded ?? new Map<string, string>())

  onMounted(async () => {
    names.value = await loadMap()
  })

  const subjectOf = (packageId: string, title: string): string =>
    names.value.get(packageId) ?? subjectFromTitle(title)

  return { subjectOf }
}
