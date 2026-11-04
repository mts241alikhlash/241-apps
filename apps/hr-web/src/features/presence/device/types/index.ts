export interface GateDevice {
  id: string
  name: string
  location?: string | null
  isActive: boolean
  lastSeenAt?: string | null
  tokenIssuedAt: string
}

export interface DeviceWithToken {
  device: GateDevice
  token: string
}

export interface RegisterDevicePayload {
  name: string
  location?: string
}
