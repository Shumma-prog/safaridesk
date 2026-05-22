import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookOpen, Plus } from 'lucide-react'
import { displayDate } from '@/lib/utils/dates'
import { formatCurrency } from '@/lib/utils/currency'
import type { Booking } from '@/types/database'

type BookingRow = Booking & {
  guests: { full_name: string; email: string | null } | null
  units: { name: string; properties: { name: string } | null } | null
}

const statusColor: Record<string, string> = {
  enquiry: '#9B9B9B',
  confirmed: '#1A5C38',
  checked_in: '#4D7BE8',
  checked_out: '#6B7280',
  cancelled: '#EF4444',
  no_show: '#C8A951',
}

const paymentBadge: Record<string, string> = {
  unpaid: 'destructive',
  partial: 'secondary',
  paid: 'default',
  refunded: 'secondary',
}

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!member) redirect('/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, guests(full_name, email), units(name, properties(name))')
    .eq('org_id', member.org_id)
    .order('check_in', { ascending: false })
    .limit(200)

  const rows = (bookings ?? []) as BookingRow[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Bookings</h1>
          <p className="text-sm text-muted-foreground">{rows.length} booking{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/bookings/new">
          <Button style={{ backgroundColor: '#1A5C38' }} className="text-white gap-2">
            <Plus className="w-4 h-4" />
            New Booking
          </Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-3">
            <BookOpen className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">No bookings yet</p>
            <Link href="/bookings/new">
              <Button variant="outline">Create first booking</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map(b => (
            <Link key={b.id} href={`/bookings/${b.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{b.guests?.full_name ?? '—'}</span>
                        <Badge
                          variant="secondary"
                          className="text-xs capitalize"
                          style={{ color: statusColor[b.status] ?? '#6B7280' }}
                        >
                          {b.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {b.units?.properties?.name} · {b.units?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {displayDate(new Date(b.check_in))} → {displayDate(new Date(b.check_out))} · {b.nights}n
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatCurrency(b.total_usd ?? 0, 'USD')}</p>
                      <Badge
                        variant={paymentBadge[b.payment_status] as 'default' | 'secondary' | 'destructive' | 'outline' ?? 'secondary'}
                        className="text-xs capitalize mt-1"
                      >
                        {b.payment_status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{b.booking_ref}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
