import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, FileText } from 'lucide-react'
import { displayDate } from '@/lib/utils/dates'
import { formatCurrency } from '@/lib/utils/currency'
import { BookingActions } from './BookingActions'
import type { Booking, Payment } from '@/types/database'

type FullBooking = Booking & {
  guests: { id: string; full_name: string; email: string | null; phone: string | null; nationality: string | null } | null
  units: { name: string; unit_type: string | null; properties: { name: string; location: string | null } | null } | null
  payments: Payment[]
}

const statusColor: Record<string, string> = {
  enquiry: '#9B9B9B',
  confirmed: '#C8A951',
  checked_in: '#1A5C38',
  checked_out: '#6B7280',
  cancelled: '#EF4444',
  no_show: '#9B9B9B',
}

const paymentStateColor: Record<string, string> = {
  pending: '#C8A951',
  completed: '#1A5C38',
  failed: '#EF4444',
  refunded: '#6B7280',
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, guests(*), units(name, unit_type, properties(name, location)), payments(*)')
    .eq('id', id)
    .single()

  if (!booking) notFound()

  const b = booking as FullBooking
  const totalPaid = b.payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount_usd, 0)
  const balance = (b.total_usd ?? 0) - totalPaid

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/bookings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold">{b.booking_ref}</h1>
            <Badge
              variant="secondary"
              className="capitalize"
              style={{ color: statusColor[b.status] ?? '#6B7280' }}
            >
              {b.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Created {displayDate(new Date(b.created_at))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/api/invoices/${b.id}`} target="_blank">
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="w-3.5 h-3.5" />
              Invoice
            </Button>
          </Link>
          <BookingActions booking={b} />
        </div>
      </div>

      {/* Stay summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Stay Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Property</p>
              <p className="font-medium">{b.units?.properties?.name ?? '—'}</p>
              {b.units?.properties?.location && (
                <p className="text-xs text-muted-foreground">{b.units.properties.location}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unit</p>
              <p className="font-medium">{b.units?.name ?? '—'}</p>
              {b.units?.unit_type && (
                <p className="text-xs text-muted-foreground capitalize">{b.units.unit_type}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Check-in</p>
              <p className="font-medium">{displayDate(new Date(b.check_in))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Check-out</p>
              <p className="font-medium">{displayDate(new Date(b.check_out))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nights</p>
              <p className="font-medium">{b.nights}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Guests</p>
              <p className="font-medium">{b.adults} adult{b.adults !== 1 ? 's' : ''}{b.children ? `, ${b.children} child${b.children !== 1 ? 'ren' : ''}` : ''}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Source</p>
              <p className="font-medium capitalize">{b.source?.replace('_', '.') ?? '—'}</p>
            </div>
            {b.agent_name && (
              <div>
                <p className="text-xs text-muted-foreground">Agent</p>
                <p className="font-medium">{b.agent_name} ({b.agent_commission}%)</p>
              </div>
            )}
          </div>

          {b.special_requests && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Special Requests</p>
                <p className="text-sm">{b.special_requests}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Guest info */}
      {b.guests && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Guest
              <Link href={`/guests/${b.guests.id}`}>
                <Button variant="ghost" size="sm" className="text-xs h-7">View profile →</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium">{b.guests.full_name}</p>
            </div>
            {b.guests.email && (
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{b.guests.email}</p>
              </div>
            )}
            {b.guests.phone && (
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{b.guests.phone}</p>
              </div>
            )}
            {b.guests.nationality && (
              <div>
                <p className="text-xs text-muted-foreground">Nationality</p>
                <p className="font-medium">{b.guests.nationality}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Financials */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            Financials
            <Link href={`/payments?booking=${b.id}`}>
              <Button variant="outline" size="sm" className="text-xs h-7">Record Payment</Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{formatCurrency(b.total_usd ?? 0, 'USD')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span className="font-semibold" style={{ color: '#1A5C38' }}>{formatCurrency(totalPaid, 'USD')}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Balance Due</span>
              <span style={{ color: balance > 0 ? '#EF4444' : '#1A5C38' }}>
                {formatCurrency(Math.max(0, balance), 'USD')}
              </span>
            </div>
          </div>

          {/* Payment list */}
          {b.payments.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Payments</p>
              {b.payments.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div>
                    <span className="capitalize">{p.method}</span>
                    {p.paid_at && <span className="text-muted-foreground ml-2 text-xs">{displayDate(new Date(p.paid_at))}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{formatCurrency(p.amount_usd, 'USD')}</span>
                    <Badge
                      variant="secondary"
                      className="text-xs capitalize"
                      style={{ color: paymentStateColor[p.status] ?? '#6B7280' }}
                    >
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
