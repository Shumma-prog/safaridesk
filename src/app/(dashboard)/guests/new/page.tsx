'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import type { Resolver } from 'react-hook-form'

const guestSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  passport_number: z.string().optional(),
})

type GuestFormValues = z.infer<typeof guestSchema>

export default function NewGuestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<GuestFormValues>({
    resolver: zodResolver(guestSchema) as unknown as Resolver<GuestFormValues>,
  })

  async function onSubmit(values: GuestFormValues) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: member } = await supabase.from('org_members').select('org_id').single()
      if (!member) throw new Error('No organization found')

      const payload = {
        ...values,
        email: values.email || null,
        org_id: member.org_id,
      }

      const { data: guest, error } = await supabase.from('guests').insert(payload).select().single()
      if (error) throw error

      toast.success('Guest added')
      router.push(`/guests/${guest.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add guest')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/guests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">New Guest</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Guest Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" placeholder="John Smith" {...register('full_name')} />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="+255 7XX XXX XXX" {...register('phone')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Input id="nationality" placeholder="e.g. British" {...register('nationality')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passport_number">Passport / ID No.</Label>
                <Input id="passport_number" placeholder="AB123456" {...register('passport_number')} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/guests">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: '#1A5C38' }}
                className="text-white"
              >
                {loading ? 'Saving…' : 'Add Guest'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
