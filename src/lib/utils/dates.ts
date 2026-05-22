import {
  format, parseISO, differenceInDays,
  isWithinInterval, startOfDay, endOfDay
} from 'date-fns'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'

const EAT = 'Africa/Dar_es_Salaam'

export function nowEAT(): Date {
  return toZonedTime(new Date(), EAT)
}

export function toEATDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatInTimeZone(d, EAT, 'dd MMM yyyy, HH:mm')
}

function toDate(value: Date | string | null | undefined): Date {
  if (!value) return new Date(NaN)
  if (value instanceof Date) return value
  return parseISO(value)
}

export function displayDate(date: Date | string | null | undefined): string {
  const d = toDate(date)
  return isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy')
}

export function displayDateShort(date: Date | string | null | undefined): string {
  const d = toDate(date)
  return isNaN(d.getTime()) ? '—' : format(d, 'dd MMM')
}

export function nightsBetween(checkIn: Date | string, checkOut: Date | string): number {
  return differenceInDays(toDate(checkOut), toDate(checkIn))
}

export function isDateOccupied(
  date: Date,
  bookings: { check_in: string; check_out: string; status: string }[]
): boolean {
  const activeStatuses = ['confirmed', 'checked_in', 'enquiry']
  return bookings
    .filter(b => activeStatuses.includes(b.status))
    .some(b =>
      isWithinInterval(date, {
        start: startOfDay(parseISO(b.check_in)),
        end: endOfDay(parseISO(b.check_out)),
      })
    )
}

export function get30Days(startDate: Date = new Date()): Date[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    return d
  })
}
