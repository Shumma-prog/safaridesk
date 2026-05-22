'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Property, Unit, Booking } from '@/types/database'

type PropertyWithUnits = Property & { units: Unit[] }
type CalendarBooking = Omit<Booking, 'guests' | 'units'> & {
  guests?: { full_name: string } | null
  units?: { name: string; properties?: { name: string } | null } | null
}

interface Props {
  properties: PropertyWithUnits[]
  bookings: CalendarBooking[]
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#1A5C38',
  checked_in: '#4D7BE8',
  enquiry: '#C8A951',
}

export function AvailabilityCalendar({ properties, bookings }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id ?? '')
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null)

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)
  const units = selectedProperty?.units ?? []

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  const bookingsByUnit = useMemo(() => {
    const map: Record<string, CalendarBooking[]> = {}
    for (const b of bookings) {
      if (!b.unit_id) continue
      if (!map[b.unit_id]) map[b.unit_id] = []
      map[b.unit_id].push(b)
    }
    return map
  }, [bookings])

  function getBookingForDay(unitId: string, day: Date) {
    return bookingsByUnit[unitId]?.find(b => {
      const cin = parseISO(b.check_in)
      const cout = parseISO(b.check_out)
      return isWithinInterval(day, { start: cin, end: addDays(cout, -1) })
    })
  }

  function isCheckIn(b: CalendarBooking, day: Date) {
    return isSameDay(parseISO(b.check_in), day)
  }

  function isCheckOut(b: CalendarBooking, day: Date) {
    return isSameDay(addDays(parseISO(b.check_out), -1), day)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <div className="flex items-center gap-2">
          {properties.length > 1 && (
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Link href="/bookings/new">
            <Button style={{ backgroundColor: '#1A5C38' }} className="text-white gap-2">
              <Plus className="w-4 h-4" />
              New Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-base font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Horizontal unit-row calendar */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {units.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground text-sm">No units in this property</p>
          ) : (
            <table className="w-full min-w-[800px] border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-white border-b border-r px-3 py-2 text-left font-medium text-muted-foreground w-28">
                    Unit
                  </th>
                  {calDays.map(day => (
                    <th
                      key={day.toISOString()}
                      className={cn(
                        'border-b border-r px-1 py-2 font-normal text-center min-w-[32px]',
                        isSameDay(day, new Date()) ? 'bg-[#E8F5EE]' : '',
                        day.getMonth() !== currentMonth.getMonth() ? 'text-muted-foreground/40' : '',
                      )}
                    >
                      <div>{format(day, 'd')}</div>
                      <div className="text-[10px] text-muted-foreground">{format(day, 'EEE')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {units.map(unit => (
                  <tr key={unit.id} className="border-b last:border-0">
                    <td className="sticky left-0 z-10 bg-white border-r px-3 py-2 font-medium whitespace-nowrap">
                      {unit.name}
                    </td>
                    {calDays.map(day => {
                      const booking = getBookingForDay(unit.id, day)
                      const color = booking ? (STATUS_COLORS[booking.status] ?? '#6B7280') : null
                      const cin = booking ? isCheckIn(booking, day) : false
                      const cout = booking ? isCheckOut(booking, day) : false

                      return (
                        <td
                          key={day.toISOString()}
                          className={cn(
                            'border-r h-10 cursor-pointer transition-opacity hover:opacity-80 relative',
                            day.getMonth() !== currentMonth.getMonth() ? 'opacity-40' : '',
                            isSameDay(day, new Date()) ? 'ring-1 ring-inset ring-[#1A5C38]/30' : '',
                          )}
                          style={color ? { backgroundColor: color + '22' } : undefined}
                          onClick={() => booking && setSelectedBooking(booking)}
                          title={booking ? `${booking.guests?.full_name} · ${booking.booking_ref}` : ''}
                        >
                          {cin && (
                            <div
                              className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                              style={{ backgroundColor: color ?? '#6B7280' }}
                            />
                          )}
                          {cout && (
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1 rounded-l"
                              style={{ backgroundColor: color ?? '#6B7280' }}
                            />
                          )}
                          {cin && (
                            <span
                              className="absolute inset-0 flex items-center pl-2 text-[10px] font-medium truncate pr-1"
                              style={{ color: color ?? '#6B7280' }}
                            >
                              {booking?.guests?.full_name?.split(' ')[0]}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="capitalize">{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Booking detail panel */}
      {selectedBooking && (
        <Card className="border-2" style={{ borderColor: STATUS_COLORS[selectedBooking.status] ?? '#6B7280' }}>
          <CardContent className="py-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold">{selectedBooking.guests?.full_name ?? '—'}</p>
                <Badge
                  variant="secondary"
                  className="text-xs capitalize"
                  style={{ color: STATUS_COLORS[selectedBooking.status] }}
                >
                  {selectedBooking.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{selectedBooking.booking_ref}</p>
              <p className="text-xs text-muted-foreground">
                {format(parseISO(selectedBooking.check_in), 'dd MMM')} →{' '}
                {format(parseISO(selectedBooking.check_out), 'dd MMM yyyy')} · {selectedBooking.nights}n
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/bookings/${selectedBooking.id}`}>
                <Button variant="outline" size="sm">View Booking</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(null)}>✕</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
