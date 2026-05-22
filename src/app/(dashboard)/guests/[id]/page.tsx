import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft } from 'lucide-react'
import { displayDate } from '@/lib/utils/dates'
import { formatCurrency } from '@/lib/utils/currency'
import type { Guest, Booking } from '@/types/database'

type GuestWithBookings = Guest & {
  bookings: (Booking & {
    units: { name: string; properties: { name: string } | null } | null
  })[]
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const bookingStatusColor: Record<string, string> = {
  pending: '#C8A951',
  confirmed: '#1A5C38',
  checked_in: '#4D7BE8',
  checked_out: '#6B7280',
  cancelled: '#EF4444',
  no_show: '#9B9B9B',
}

export default async function GuestProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: guest } = await supabase
    .from('guests')
    .select('*, bookings(*, units(name, properties(name)))')
    .eq('id', id)
    .single()

  if (!guest) notFound()

  const g = guest as GuestWithBookings
  const totalSpend = g.bookings.reduce((sum, b) => sum + (b.total_usd ?? 0), 0)

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/guests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Guest Profile</h1>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-14 h-14 shrink-0">
              <AvatarFallback
                className="text-lg text-white"
                style={{ backgroundColor: '#1A5C38' }}
              >
                {initials(g.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold">{g.full_name}</h2>
              {g.email && <p className="text-sm text-muted-foreground">{g.email}</p>}
              {g.phone && <p className="text-sm text-muted-foreground">{g.phone}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Total spend</p>
              <p className="text-lg font-bold" style={{ color: '#1A5C38' }}>
                {formatCurrency(totalSpend, 'USD')}
              </p>
              <p className="text-xs text-muted-foreground">{g.bookings.length} booking{g.bookings.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Nationality</p>
              <p className="font-medium">{g.nationality ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Passport / ID</p>
              <p className="font-medium">{g.passport_number ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">VIP</p>
              <p className="font-medium">{g.is_vip ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking history */}
      <div>
        <h2 className="text-base font-semibold mb-3">Booking History</h2>
        {g.bookings.length === 0
          ? <p className="text-sm text-muted-foreground">No bookings yet</p>
          : (
            <div className="space-y-2">
              {g.bookings.map(b => (
                <Link key={b.id} href={`/bookings/${b.id}`}>
                  <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                    <CardContent className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{b.booking_ref}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.units?.properties?.name} · {b.units?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {displayDate(new Date(b.check_in))} → {displayDate(new Date(b.check_out))}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{formatCurrency(b.total_usd ?? 0, 'USD')}</p>
                        <Badge
                          variant="secondary"
                          className="text-xs capitalize mt-1"
                          style={{ color: bookingStatusColor[b.status] ?? '#6B7280' }}
                        >
                          {b.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )
        }
      </div>
    </div>
  )
}
