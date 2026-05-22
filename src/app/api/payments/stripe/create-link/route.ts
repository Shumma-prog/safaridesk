import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'

const schema = z.object({
  booking_id: z.string().uuid(),
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

    const { booking_id, amount_usd } = parsed.data

    const { data: booking } = await supabase
      .from('bookings')
      .select('booking_ref, guests(full_name, email), org_id')
      .eq('id', booking_id)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const guest = booking.guests as { full_name: string; email: string | null } | null

    // Create Stripe Payment Link
    const product = await stripe.products.create({
      name: `SafariDesk Booking ${booking.booking_ref}`,
    })

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(amount_usd * 100),
      currency: 'usd',
    })

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { booking_id, org_id: booking.org_id },
      after_completion: {
        type: 'redirect',
        redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${booking_id}?payment=success` },
      },
    })

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
      amount_tzs: null,
      currency: 'USD',
      method: 'stripe',
      status: 'pending',
      stripe_link_id: paymentLink.id,
      paid_at: null,
    })

    return NextResponse.json({ url: paymentLink.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
