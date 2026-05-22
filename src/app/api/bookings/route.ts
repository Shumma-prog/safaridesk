import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBookingRef } from '@/lib/utils/booking-ref'
import { nightsBetween } from '@/lib/utils/dates'
import { usdToTzs } from '@/lib/utils/currency'
import { z } from 'zod'

const createBookingSchema = z.object({
  unit_id: z.string().uuid(),
  guest_id: z.string().uuid().optional(),
  new_guest: z.object({
    full_name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    nationality: z.string().optional(),
  }).optional(),
  check_in: z.string().datetime({ offset: true }).or(z.string().date()),
  check_out: z.string().datetime({ offset: true }).or(z.string().date()),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  total_usd: z.number().min(0),
  currency: z.enum(['USD', 'TZS']).default('USD'),
  source: z.enum(['direct', 'whatsapp', 'email', 'booking_com', 'airbnb', 'expedia', 'agent', 'phone', 'walk_in', 'other']).default('direct'),
  agent_name: z.string().optional(),
  agent_commission: z.number().min(0).max(100).default(0),
  special_requests: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: member } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!member) return NextResponse.json({ error: 'No organization' }, { status: 403 })

    const body = await req.json()
    const parsed = createBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const input = parsed.data

    // Resolve guest
    let guestId = input.guest_id
    if (!guestId && input.new_guest) {
      const { data: newGuest, error: guestError } = await supabase
        .from('guests')
        .insert({ ...input.new_guest, org_id: member.org_id })
        .select()
        .single()
      if (guestError) throw guestError
      guestId = newGuest.id
    }
    if (!guestId) return NextResponse.json({ error: 'Guest required' }, { status: 400 })

    // Fetch unit for property_id
    const { data: unit } = await supabase
      .from('units')
      .select('property_id, base_rate_usd')
      .eq('id', input.unit_id)
      .single()

    if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

    const nights = nightsBetween(new Date(input.check_in), new Date(input.check_out))
    const totalUsd = input.total_usd
    const totalTzs = usdToTzs(totalUsd)
    const bookingRef = await generateBookingRef(supabase)

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        booking_ref: bookingRef,
        org_id: member.org_id,
        property_id: unit.property_id,
        unit_id: input.unit_id,
        guest_id: guestId,
        check_in: input.check_in,
        check_out: input.check_out,
        nights,
        adults: input.adults,
        children: input.children,
        status: 'confirmed',
        payment_status: 'unpaid',
        total_usd: totalUsd,
        total_tzs: totalTzs,
        paid_usd: 0,
        currency: input.currency,
        source: input.source,
        agent_name: input.agent_name ?? null,
        agent_commission: input.agent_commission ?? 0,
        special_requests: input.special_requests ?? null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ booking }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: member } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!member) return NextResponse.json({ error: 'No organization' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let query = supabase
      .from('bookings')
      .select('*, guests(full_name, email, phone), units(name, properties(name))')
      .eq('org_id', member.org_id)
      .order('check_in', { ascending: false })

    if (status) query = query.eq('status', status)
    if (from) query = query.gte('check_in', from)
    if (to) query = query.lte('check_in', to)

    const { data: bookings, error } = await query
    if (error) throw error

    return NextResponse.json({ bookings })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
