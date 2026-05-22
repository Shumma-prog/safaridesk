import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const session = event.data.object as Stripe.CheckoutSession | Stripe.PaymentIntent
    const bookingId = session.metadata?.booking_id
    if (!bookingId) return NextResponse.json({ received: true })

    const amountPaid = ('amount_received' in session ? session.amount_received : session.amount_total) ?? 0

    const supabase = await createClient()

    // Update payment record to completed
    await supabase
      .from('payments')
      .update({ status: 'completed', paid_at: new Date().toISOString(), stripe_payment_id: session.id })
      .eq('booking_id', bookingId)
      .eq('status', 'pending')
      .eq('method', 'stripe')

    // Update booking paid_usd
    const { data: booking } = await supabase
      .from('bookings')
      .select('paid_usd, total_usd')
      .eq('id', bookingId)
      .single()

    if (booking) {
      const newPaid = (booking.paid_usd ?? 0) + amountPaid / 100
      const paymentStatus = newPaid >= (booking.total_usd ?? 0) ? 'paid' : 'partial'
      await supabase.from('bookings').update({ paid_usd: newPaid, payment_status: paymentStatus }).eq('id', bookingId)
    }
  }

  return NextResponse.json({ received: true })
}
