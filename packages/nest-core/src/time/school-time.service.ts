import { Injectable, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  schoolDate,
  schoolDayRange,
  schoolMinutesOfDay,
  schoolYearMonth,
} from './school-time.js'

@Injectable()
export class SchoolTimeService {
  private readonly timeZone: string

  constructor(config: ConfigService) {
    this.timeZone = config.getOrThrow<string>('SCHOOL_TIME_ZONE')
  }

  today(at: Date = new Date()): Date {
    return schoolDate(at, this.timeZone)
  }

  yearMonth(at: Date = new Date()): { year: number; month: number } {
    return schoolYearMonth(at, this.timeZone)
  }

  dayRange(date: Date): { from: Date; to: Date } {
    return schoolDayRange(date, this.timeZone)
  }

  minutesOfDay(at: Date): number {
    return schoolMinutesOfDay(at, this.timeZone)
  }
}

@Module({
  providers: [SchoolTimeService],
  exports: [SchoolTimeService],
})
export class SchoolTimeModule {}
