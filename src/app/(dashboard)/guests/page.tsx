import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users, Plus } from 'lucide-react'
import type { Guest } from '@/types/database'

type GuestWithCount = Guest & { bookings: { id: string }[] }

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default async function GuestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!member) redirect('/login')

  const { data: guests } = await supabase
    .from('guests')
    .select('*, bookings(id)')
    .eq('org_id', member.org_id)
    .order('full_name', { ascending: true })

  const guestList = (guests ?? []) as GuestWithCount[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Guests</h1>
          <p className="text-sm text-muted-foreground">{guestList.length} guest{guestList.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/guests/new">
          <Button style={{ backgroundColor: '#1A5C38' }} className="text-white gap-2">
            <Plus className="w-4 h-4" />
            Add Guest
          </Button>
        </Link>
      </div>

      {guestList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-3">
            <Users className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">No guests yet</p>
            <Link href="/guests/new">
              <Button variant="outline">Add your first guest</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {guestList.map(g => (
            <Link key={g.id} href={`/guests/${g.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-3 flex items-center gap-4">
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarFallback
                      className="text-xs text-white"
                      style={{ backgroundColor: '#1A5C38' }}
                    >
                      {initials(g.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {g.email ?? ''}
                      {g.phone ? (g.email ? ' · ' : '') + g.phone : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {g.bookings.length} booking{g.bookings.length !== 1 ? 's' : ''}
                    </Badge>
                    {g.nationality && (
                      <span className="text-xs text-muted-foreground hidden sm:block">{g.nationality}</span>
                    )}
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
