'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { nightsBetween } from '@/lib/utils/dates'
import { formatCurrency, usdToTzs } from '@/lib/utils/currency'
import type { Property, Unit, Guest } from '@/types/database'
import type { Resolver } from 'react-hook-form'

type PropertyWithUnits = Property & { units: Unit[] }
type GuestOption = Pick<Guest, 'id' | 'full_name' | 'email' | 'phone'>

const bookingSchema = z.object({
  property_id: z.string().uuid('Select a property'),
  unit_id: z.string().uuid('Select a unit'),
  guest_mode: z.enum(['existing', 'new']),
  guest_id: z.string().uuid().optional(),
  new_guest_name: z.string().optional(),
  new_guest_email: z.string().optional(),
  new_guest_phone: z.string().optional(),
  new_guest_nationality: z.string().optional(),
  check_in: z.string().min(1, 'Required'),
  check_out: z.string().min(1, 'Required'),
  adults: z.number().int().min(1),
  children: z.number().int().min(0),
  source: z.enum(['direct', 'whatsapp', 'email', 'booking_com', 'airbnb', 'expedia', 'agent', 'phone', 'walk_in', 'other']),
  agent_name: z.string().optional(),
  agent_commission: z.number().min(0).max(100),
  currency: z.enum(['USD', 'TZS']),
  total_usd: z.number().min(0),
  special_requests: z.string().optional(),
})

type BookingFormValues = z.infer<typeof bookingSchema>

interface Props {
  properties: PropertyWithUnits[]
  guests: GuestOption[]
}

export function BookingForm({ properties, guests }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema) as unknown as Resolver<BookingFormValues>,
    defaultValues: {
      guest_mode: 'existing',
      adults: 2,
      children: 0,
      source: 'direct',
      agent_commission: 0,
      currency: 'USD',
      total_usd: 0,
    },
  })

  const propertyId = watch('property_id')
  const unitId = watch('unit_id')
  const checkIn = watch('check_in')
  const checkOut = watch('check_out')
  const guestMode = watch('guest_mode')
  const source = watch('source')
  const totalUsd = watch('total_usd')

  const selectedProperty = properties.find(p => p.id === propertyId)
  const availableUnits = selectedProperty?.units.filter(u => u.status === 'available') ?? []
  const selectedUnit = availableUnits.find(u => u.id === unitId)

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0
    try { return Math.max(0, nightsBetween(new Date(checkIn), new Date(checkOut))) } catch { return 0 }
  }, [checkIn, checkOut])

  const suggestedRate = useMemo(() => {
    if (!selectedUnit?.base_rate_usd || !nights) return 0
    return selectedUnit.base_rate_usd * nights
  }, [selectedUnit, nights])

  const totalTzs = usdToTzs(totalUsd ?? 0)

  async function onSubmit(values: BookingFormValues) {
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        unit_id: values.unit_id,
        check_in: values.check_in,
        check_out: values.check_out,
        adults: values.adults,
        children: values.children,
        total_usd: values.total_usd,
        currency: values.currency,
        source: values.source,
        agent_name: values.agent_name,
        agent_commission: values.agent_commission,
        special_requests: values.special_requests,
      }

      if (values.guest_mode === 'existing' && values.guest_id) {
        payload.guest_id = values.guest_id
      } else {
        payload.new_guest = {
          full_name: values.new_guest_name,
          email: values.new_guest_email,
          phone: values.new_guest_phone,
          nationality: values.new_guest_nationality,
        }
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Booking failed')

      toast.success(`Booking ${data.booking.booking_ref} created`)
      router.push(`/bookings/${data.booking.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create booking')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/bookings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">New Booking</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Property + Unit */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Accommodation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Property</Label>
              <Controller
                name="property_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={v => { field.onChange(v); setValue('unit_id', '') }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property…" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.property_id && <p className="text-xs text-destructive">{errors.property_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Unit / Room</Label>
              <Controller
                name="unit_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} disabled={!propertyId}>
                    <SelectTrigger>
                      <SelectValue placeholder={propertyId ? 'Select unit…' : 'Select property first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUnits.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                          {u.base_rate_usd ? ` — $${u.base_rate_usd}/night` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.unit_id && <p className="text-xs text-destructive">{errors.unit_id.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Dates + Guests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Stay Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-in</Label>
                <Input type="date" {...register('check_in')} />
                {errors.check_in && <p className="text-xs text-destructive">{errors.check_in.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Check-out</Label>
                <Input type="date" {...register('check_out')} />
                {errors.check_out && <p className="text-xs text-destructive">{errors.check_out.message}</p>}
              </div>
            </div>

            {nights > 0 && (
              <p className="text-sm text-muted-foreground">
                {nights} night{nights !== 1 ? 's' : ''}
                {suggestedRate > 0 && ` · Suggested: ${formatCurrency(suggestedRate, 'USD')}`}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Adults</Label>
                <Input type="number" min={1} {...register('adults', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Children</Label>
                <Input type="number" min={0} {...register('children', { valueAsNumber: true })} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guest */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Guest</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              value={guestMode}
              onValueChange={v => setValue('guest_mode', v as 'existing' | 'new')}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="existing">Existing Guest</TabsTrigger>
                <TabsTrigger value="new">New Guest</TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="space-y-2">
                <Label>Search Guest</Label>
                <Controller
                  name="guest_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select guest…" />
                      </SelectTrigger>
                      <SelectContent>
                        {guests.map(g => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.full_name}{g.email ? ` (${g.email})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </TabsContent>

              <TabsContent value="new" className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input placeholder="John Smith" {...register('new_guest_name')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="john@example.com" {...register('new_guest_email')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input placeholder="+255 7XX XXX XXX" {...register('new_guest_phone')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nationality</Label>
                  <Input placeholder="e.g. British" {...register('new_guest_nationality')} />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Pricing + Source */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pricing & Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total (USD)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={suggestedRate > 0 ? String(suggestedRate) : '0'}
                  {...register('total_usd', { valueAsNumber: true })}
                />
                {totalTzs > 0 && (
                  <p className="text-xs text-muted-foreground">≈ {formatCurrency(totalTzs, 'TZS')}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Select defaultValue="USD" onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="TZS">TZS</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Booking Source</Label>
                <Controller
                  name="source"
                  control={control}
                  render={({ field }) => (
                    <Select defaultValue="direct" onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['direct', 'whatsapp', 'email', 'booking_com', 'airbnb', 'expedia', 'agent', 'phone', 'walk_in', 'other'].map(s => (
                          <SelectItem key={s} value={s} className="capitalize">{s.replace('_', '.')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {source === 'agent' && (
                <div className="space-y-2">
                  <Label>Agent Name</Label>
                  <Input placeholder="Agent / operator name" {...register('agent_name')} />
                </div>
              )}
            </div>

            {source === 'agent' && (
              <div className="space-y-2">
                <Label>Commission (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  {...register('agent_commission', { valueAsNumber: true })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Special Requests</Label>
              <Textarea rows={2} placeholder="e.g. honeymoon setup, dietary requirements…" {...register('special_requests')} />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {nights > 0 && totalUsd > 0 && (
          <Card className="border-2" style={{ borderColor: '#1A5C38' }}>
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{nights} nights · {selectedUnit?.name}</p>
                <p className="text-xs text-muted-foreground">Status: confirmed · Payment: unpaid</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: '#1A5C38' }}>{formatCurrency(totalUsd, 'USD')}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(totalTzs, 'TZS')}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/bookings">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: '#1A5C38' }}
            className="text-white"
          >
            {loading ? 'Creating…' : 'Create Booking'}
          </Button>
        </div>
      </form>
    </div>
  )
}
