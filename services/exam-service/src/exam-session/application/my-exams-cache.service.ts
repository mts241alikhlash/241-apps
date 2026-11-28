import { Injectable } from '@nestjs/common'
import type { MyExam } from './use-cases/list-my-exams/list-my-exams.use-case.js'

export const MY_EXAMS_CACHE_MS = 3000
export const MY_EXAMS_CACHE_MAX_ENTRIES = 2000

interface Entry {
  value: MyExam[]
  expiresAt: number
}

@Injectable()
export class MyExamsCacheService {
  private readonly done = new Map<string, Entry>()
  private readonly running = new Map<string, Promise<MyExam[]>>()

  load(userId: string, produce: () => Promise<MyExam[]>): Promise<MyExam[]> {
    const entry = this.done.get(userId)
    if (entry !== undefined && entry.expiresAt > Date.now()) {
      return Promise.resolve(entry.value)
    }
    const inFlight = this.running.get(userId)
    if (inFlight !== undefined) return inFlight

    const promise = produce().then(
      (value) => {
        if (this.running.get(userId) === promise) {
          this.running.delete(userId)
          this.store(userId, value)
        }
        return value
      },
      (error: unknown) => {
        if (this.running.get(userId) === promise) this.running.delete(userId)
        throw error
      },
    )
    this.running.set(userId, promise)
    return promise
  }

  invalidate(userId: string): void {
    this.done.delete(userId)
    this.running.delete(userId)
  }

  private store(userId: string, value: MyExam[]): void {
    this.done.delete(userId)
    if (this.done.size >= MY_EXAMS_CACHE_MAX_ENTRIES) {
      const oldest = this.done.keys().next()
      if (!oldest.done) this.done.delete(oldest.value)
    }
    this.done.set(userId, {
      value,
      expiresAt: Date.now() + MY_EXAMS_CACHE_MS,
    })
  }
}
