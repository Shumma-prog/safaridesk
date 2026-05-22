import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OccupancyChartClient } from '@/components/dashboard/OccupancyChartClient'
import { BookingSourceChartClient } from '@/components/dashboard/BookingSourceChartClient'
import { formatCurrency } from '@/lib/utils/currency'
import { displayDateShort, get30Days } from '@/lib/utils/dates'
import { toZonedTime } from 'date-fns-tz'
import { startOfDay, endOfDay } from 'date-fns'
import type { Booking, Unit } from '@/types/database'

const TZ = 'Africa/Dar_es_Salaam'

type BookingWithRelations = Booking & {
  guests: { full_name: string } | null
  units: (Unit & { properties: { name: string } | null }) | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get org
  const { data: member } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!member) redirect('/login')
  const orgId = member.org_id

  const nowEat = toZonedTime(new Date(), TZ)
  const todayStart = startOfDay(nowEat).toISOString()
  const todayEnd = endOfDay(nowEat).toISOString()

  // Fetch data in parallel
  const [
    { data: allBookings },
    { data: todayArrivals },
    { data: todayDepartures },
    { data: allUnits },
    { data: recentPayments },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, guests(full_name), units(*, properties(name))')
      .eq('org_id', orgId)
      .in('status', ['confirmed', 'checked_in'])
      .order('check_in', { ascending: true }),

    supabase
      .from('bookings')
      .select('*, guests(full_name), units(*, properties(name))')
      .eq('org_id', orgId)
      .gte('check_in', todayStart)
      .lte('check_in', todayEnd)
      .order('check_in', { ascending: true }),

    supabase
      .from('bookings')
      .select('*, guests(full_name), units(*, properties(name))')
      .eq('org_id', orgId)
      .gte('check_out', todayStart)
      .lte('check_out', todayEnd)
      .order('check_out', { ascending: true }),

    supabase
      .from('units')
      .select('id, status')
      .eq('org_id', orgId),

    supabase
      .from('payments')
      .select('amount_usd')
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .gte('paid_at', new Date(nowEat.getFullYear(), nowEat.getMonth(), 1).toISOString()),
  ])

  const bookings = (allBookings ?? []) as BookingWithRelations[]
  const units = allUnits ?? []

  // KPIs
  const totalUnits = units.length
  const occupiedUnits = bookings.filter(b => b.status === 'checked_in').length
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

  const monthRevenue = (recentPayments ?? []).reduce((sum, p) => sum + (p.amount_usd ?? 0), 0)

  const pendingBookings = bookings.filter(b => b.status === 'confirmed').length

  // 30-day occupancy for chart
  const days = get30Days()
  const occupancyData = days.map((day) => {
    const inRange = bookings.filter(b => {
      const cin = new Date(b.check_in)
      const cout = new Date(b.check_out)
      return cin <= day && cout > day
    })
    return {
      date: displayDateShort(day),
      rate: totalUnits > 0 ? Math.round((inRange.length / totalUnits) * 100) : 0,
    }
  })

  // Booking source breakdown
  const sourceMap: Record<string, number> = {}
  bookings.forEach(b => {
    const src = b.source ?? 'direct'
    sourceMap[src] = (sourceMap[src] ?? 0) + 1
  })
  const sourceColors: Record<string, string> = {
    direct: '#1A5C38',
    booking_com: '#C8A951',
    airbnb: '#E87D4D',
    expedia: '#4D7BE8',
    other: '#9B9B9B',
  }
  const sourceData = Object.entries(sourceMap).map(([name, value]) => ({
    name: name.replace('_', '.'),
    value,
    fill: sourceColors[name] ?? '#9B9B9B',
  }))

  const arrivals = (todayArrivals ?? []) as BookingWithRelations[]
  const departures = (todayDepartures ?? []) as BookingWithRelations[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview for {displayDateShort(nowEat)}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" style={{ color: '#1A5C38' }}>{occupancyRate}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">{occupiedUnits} of {totalUnits} units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Month Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(monthRevenue, 'USD')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">this month (completed)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Arrivals Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{arrivals.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">check-ins</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingBookings}</p>
            <p className="text-xs text-muted-foreground mt-0.5">confirmed bookings</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">30-Day Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <OccupancyChartClient data={occupancyData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Booking Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceData.length > 0
              ? <BookingSourceChartClient data={sourceData} />
              : <p className="text-sm text-muted-foreground py-8 text-center">No bookings yet</p>
            }
          </CardContent>
        </Card>
      </div>

      {/* Arrivals & Departures */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Arrivals
              <Badge variant="secondary">{arrivals.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {arrivals.length === 0
              ? <p className="text-sm text-muted-foreground">No arrivals today</p>
              : (
                <div className="space-y-3">
                  {arrivals.map(b => (
                    <div key={b.id} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{b.guests?.full_name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.units?.properties?.name} · {b.units?.name}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {b.booking_ref}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Departures
              <Badge variant="secondary">{departures.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {departures.length === 0
              ? <p className="text-sm text-muted-foreground">No departures today</p>
              : (
                <div className="space-y-3">
                  {departures.map(b => (
                    <div key={b.id} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{b.guests?.full_name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.units?.properties?.name} · {b.units?.name}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {b.booking_ref}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
