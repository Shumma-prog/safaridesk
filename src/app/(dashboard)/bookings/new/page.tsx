import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookingForm } from './BookingForm'
import type { Property, Unit, Guest } from '@/types/database'

type PropertyWithUnits = Property & { units: Unit[] }

export default async function NewBookingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!member) redirect('/login')

  const [{ data: properties }, { data: guests }] = await Promise.all([
    supabase
      .from('properties')
      .select('*, units(*)')
      .eq('org_id', member.org_id)
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('guests')
      .select('id, full_name, email, phone')
      .eq('org_id', member.org_id)
      .order('full_name')
      .limit(500),
  ])

  return (
    <BookingForm
      properties={(properties ?? []) as PropertyWithUnits[]}
      guests={(guests ?? []) as Pick<Guest, 'id' | 'full_name' | 'email' | 'phone'>[]}
    />
  )
}
