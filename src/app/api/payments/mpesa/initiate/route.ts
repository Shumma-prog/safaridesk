import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initiateSTKPush } from '@/lib/mpesa/daraja'
import { usdToTzs } from '@/lib/utils/currency'
import { z } from 'zod'

const schema = z.object({
  booking_id: z.string().uuid(),
  phone: z.string().min(10).max(13),
  amount_usd: z.number().positive(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { booking_id, phone, amount_usd } = parsed.data

    const { data: booking } = await supabase
      .from('bookings')
      .select('booking_ref, org_id')
      .eq('id', booking_id)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const amountTzs = Math.round(usdToTzs(amount_usd))
    const stkResponse = await initiateSTKPush({
      phone,
      amount: amountTzs,
      bookingRef: booking.booking_ref,
    })

    if (!stkResponse.CheckoutRequestID) {
      throw new Error(stkResponse.errorMessage ?? 'STK Push failed')
    }

    // Record pending payment
    const { data: member } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    await supabase.from('payments').insert({
      booking_id,
      org_id: member?.org_id ?? booking.org_id,
      amount_usd,
      amount_tzs: amountTzs,
      currency: 'TZS',
      method: 'mpesa',
      status: 'pending',
      mpesa_checkout_id: stkResponse.CheckoutRequestID,
      mpesa_phone: phone,
      paid_at: null,
    })

    return NextResponse.json({
      checkout_request_id: stkResponse.CheckoutRequestID,
      message: 'STK Push sent. Please enter your M-Pesa PIN.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
