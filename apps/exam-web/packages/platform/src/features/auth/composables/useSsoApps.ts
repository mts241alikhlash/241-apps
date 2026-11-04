import { ref } from 'vue'
import { ssoApi } from '../api/ssoApi'
import type { SsoApp } from '../types'

const apps = ref<SsoApp[]>([])
let loading: Promise<void> | null = null

export function useSsoApps() {
  function load(): Promise<void> {
    loading ??= ssoApi
      .apps()
      .then((res) => {
        apps.value = res.data?.data ?? []
      })
      .catch(() => {
        loading = null
      })
    return loading
  }

  return { apps, load }
}
