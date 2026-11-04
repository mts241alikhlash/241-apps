import axios from 'axios'
import type {
  BatchScanResult,
  ClockAnchor,
  QueuedScan,
  ScanResult,
} from '../types'

const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:3000'
).replace(/\/+$/, '')

const deviceApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

export const kioskApi = {
  pair: (token: string) =>
    deviceApi.post<void>('/presence/scans/pair', null, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getClockAnchor: () =>
    deviceApi.get<{ data: ClockAnchor }>('/presence/scans/clock'),

  scan: (payload: QueuedScan) =>
    deviceApi.post<{ data: ScanResult }>('/presence/scans', payload),

  flush: (scans: QueuedScan[]) =>
    deviceApi.post<{ data: BatchScanResult[] }>('/presence/scans/batch', {
      scans,
    }),
}
