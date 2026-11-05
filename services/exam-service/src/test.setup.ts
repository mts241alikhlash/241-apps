const FROZEN_NOW = new Date('2026-11-02T00:00:00.000Z').getTime()

const RealDate = Date

class FrozenDate extends RealDate {
  constructor(...args: unknown[]) {
    if (args.length === 0) {
      super(FROZEN_NOW)
      return
    }
    super(...(args as [number]))
  }

  static now(): number {
    return FROZEN_NOW
  }
}

globalThis.Date = FrozenDate as DateConstructor
