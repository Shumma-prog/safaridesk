import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { PropertyUnitActions } from './PropertyUnitActions'
import type { Property, Unit } from '@/types/database'

type PropertyWithUnits = Property & { units: Unit[] }

const unitStatusColor: Record<string, string> = {
  available: '#1A5C38',
  occupied: '#C8A951',
  maintenance: '#EF4444',
  blocked: '#6B7280',
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: property } = await supabase
    .from('properties')
    .select('*, units(*)')
    .eq('id', id)
    .single()

  if (!property) notFound()

  const prop = property as PropertyWithUnits

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/properties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">{prop.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {prop.property_type?.replace('_', ' ') ?? 'Lodge'}
            {prop.location ? ` · ${prop.location}` : ''}
          </p>
        </div>
      </div>

      {/* Property info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Property Details</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Name</p>
            <p className="font-medium">{prop.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Type</p>
            <p className="font-medium capitalize">{prop.property_type?.replace('_', ' ') ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Location</p>
            <p className="font-medium">{prop.location ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Total Units</p>
            <p className="font-medium">{prop.units.length}</p>
          </div>
          {prop.description && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground text-xs">Description</p>
              <p>{prop.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Units */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Units / Rooms</h2>
          <PropertyUnitActions propertyId={id} mode="add" />
        </div>

        {prop.units.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground text-sm">No units yet. Add your first room or tent.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {prop.units.map(unit => (
              <Card key={unit.id}>
                <CardContent className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: unitStatusColor[unit.status] ?? '#6B7280' }}
                    />
                    <div>
                      <p className="text-sm font-medium">{unit.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {unit.unit_type?.replace('_', ' ') ?? '—'}
                        {unit.max_guests ? ` · up to ${unit.max_guests} guests` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {unit.base_rate_usd && (
                      <span className="text-sm font-medium">${unit.base_rate_usd}/night</span>
                    )}
                    <Badge
                      variant="secondary"
                      className="capitalize text-xs"
                      style={{ color: unitStatusColor[unit.status] ?? '#6B7280' }}
                    >
                      {unit.status}
                    </Badge>
                    <PropertyUnitActions propertyId={id} unit={unit} mode="edit" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
