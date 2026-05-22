import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface MpesaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value: string | number }>
      }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: MpesaCallback = await req.json()
    const { stkCallback } = body.Body
    const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback

    const supabase = await createClient()

    if (ResultCode !== 0) {
      // Payment failed
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('mpesa_checkout_id', CheckoutRequestID)
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    // Extract receipt number
    const items = CallbackMetadata?.Item ?? []
    const receipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value as string | undefined
    const mpesaAmount = items.find(i => i.Name === 'Amount')?.Value as number | undefined

    await supabase
      .from('payments')
      .update({
        status: 'completed',
        mpesa_receipt: receipt ?? null,
        paid_at: new Date().toISOString(),
      })
      .eq('mpesa_checkout_id', CheckoutRequestID)

    // Update booking payment status
    const { data: payment } = await supabase
      .from('payments')
      .select('booking_id, amount_usd')
      .eq('mpesa_checkout_id', CheckoutRequestID)
      .single()

    if (payment) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('paid_usd, total_usd')
        .eq('id', payment.booking_id)
        .single()

      if (booking) {
        const newPaid = (booking.paid_usd ?? 0) + (payment.amount_usd ?? 0)
        const paymentStatus = newPaid >= (booking.total_usd ?? 0) ? 'paid' : 'partial'
        await supabase
          .from('bookings')
          .update({ paid_usd: newPaid, payment_status: paymentStatus })
          .eq('id', payment.booking_id)
      }
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}
