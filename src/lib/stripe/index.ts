import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

export async function createPaymentLink({
  amountUsd, bookingRef, guestEmail, description,
}: {
  amountUsd: number
  bookingRef: string
  guestEmail?: string
  description: string
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `SafariDesk Booking ${bookingRef}`, description },
        unit_amount: Math.round(amountUsd * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings?payment=success&ref=${bookingRef}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/bookings?payment=cancelled&ref=${bookingRef}`,
    customer_email: guestEmail,
    metadata: { booking_ref: bookingRef },
  })
  return session.url!
}
