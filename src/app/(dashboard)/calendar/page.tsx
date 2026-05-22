import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AvailabilityCalendar } from './AvailabilityCalendar'
import type { Property, Unit, Booking } from '@/types/database'

type PropertyWithUnits = Property & { units: Unit[] }
type CalendarBooking = Omit<Booking, 'guests' | 'units'> & {
  guests?: { full_name: string } | null
  units?: { name: string; properties?: { name: string } | null } | null
}

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!member) redirect('/login')

  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const to = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

  const [{ data: properties }, { data: bookings }] = await Promise.all([
    supabase
      .from('properties')
      .select('*, units(*)')
      .eq('org_id', member.org_id)
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('bookings')
      .select('*, guests(full_name), units(name, properties(name))')
      .eq('org_id', member.org_id)
      .gte('check_out', from)
      .lte('check_in', to)
      .in('status', ['confirmed', 'checked_in', 'enquiry']),
  ])

  return (
    <AvailabilityCalendar
      properties={(properties ?? []) as PropertyWithUnits[]}
      bookings={(bookings ?? []) as CalendarBooking[]}
    />
  )
}
