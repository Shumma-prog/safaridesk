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
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import type { Resolver } from 'react-hook-form'

const propertySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  property_type: z.enum(['lodge', 'tented_camp', 'hotel', 'boutique_hotel', 'other']),
  location: z.string().optional(),
  description: z.string().optional(),
})

type PropertyFormValues = z.infer<typeof propertySchema>

export default function NewPropertyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema) as unknown as Resolver<PropertyFormValues>,
    defaultValues: { property_type: 'lodge' },
  })

  async function onSubmit(values: PropertyFormValues) {
    setLoading(true)
    try {
      const supabase = createClient()

      const { data: member } = await supabase
        .from('org_members')
        .select('org_id')
        .single()

      if (!member) throw new Error('No organization found')

      const { data: prop, error } = await supabase
        .from('properties')
        .insert({ ...values, org_id: member.org_id })
        .select()
        .single()

      if (error) throw error
      toast.success('Property created')
      router.push(`/properties/${prop.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create property')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/properties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">New Property</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Property Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Property Name</Label>
              <Input id="name" placeholder="Serengeti Sunset Lodge" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Property Type</Label>
              <Select
                defaultValue="lodge"
                onValueChange={v => setValue('property_type', v as PropertyFormValues['property_type'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lodge">Lodge</SelectItem>
                  <SelectItem value="tented_camp">Tented Camp</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="boutique_hotel">Boutique Hotel</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="e.g. Serengeti, Tanzania" {...register('location')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" rows={3} placeholder="Brief description of your property…" {...register('description')} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/properties">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: '#1A5C38' }}
                className="text-white"
              >
                {loading ? 'Creating…' : 'Create Property'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
