import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Building2 } from 'lucide-react'
import type { Property } from '@/types/database'

type PropertyWithUnits = Property & {
  units: { id: string; status: string }[]
}

export default async function PropertiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!member) redirect('/login')

  const { data: properties } = await supabase
    .from('properties')
    .select('*, units(id, status)')
    .eq('org_id', member.org_id)
    .order('created_at', { ascending: true })

  const props = (properties ?? []) as PropertyWithUnits[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Properties</h1>
          <p className="text-sm text-muted-foreground">{props.length} propert{props.length === 1 ? 'y' : 'ies'}</p>
        </div>
        <Link href="/properties/new">
          <Button style={{ backgroundColor: '#1A5C38' }} className="text-white gap-2">
            <Plus className="w-4 h-4" />
            Add Property
          </Button>
        </Link>
      </div>

      {props.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-3">
            <Building2 className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">No properties yet</p>
            <Link href="/properties/new">
              <Button variant="outline">Add your first property</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {props.map(p => {
            const totalUnits = p.units.length
            const availableUnits = p.units.filter(u => u.status === 'available').length
            return (
              <Link key={p.id} href={`/properties/${p.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <Badge variant="secondary" className="capitalize shrink-0">
                        {p.property_type?.replace('_', ' ') ?? 'lodge'}
                      </Badge>
                    </div>
                    {p.location && (
                      <p className="text-xs text-muted-foreground">{p.location}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="font-semibold">{totalUnits}</span>
                        <span className="text-muted-foreground ml-1">units</span>
                      </div>
                      <div>
                        <span className="font-semibold" style={{ color: '#1A5C38' }}>{availableUnits}</span>
                        <span className="text-muted-foreground ml-1">available</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
