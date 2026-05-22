'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil } from 'lucide-react'
import type { Unit } from '@/types/database'
import type { Resolver } from 'react-hook-form'

const unitSchema = z.object({
  name: z.string().min(1, 'Name required'),
  unit_type: z.string().min(1, 'Type required'),
  max_guests: z.number().int().min(1).max(50),
  base_rate_usd: z.number().min(0),
  status: z.enum(['available', 'occupied', 'maintenance', 'blocked']),
})

type UnitFormValues = z.infer<typeof unitSchema>

interface Props {
  propertyId: string
  unit?: Unit
  mode: 'add' | 'edit'
}

export function PropertyUnitActions({ propertyId, unit, mode }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema) as unknown as Resolver<UnitFormValues>,
    defaultValues: unit
      ? {
          name: unit.name,
          unit_type: unit.unit_type ?? 'tent',
          max_guests: unit.max_guests ?? 2,
          base_rate_usd: unit.base_rate_usd ?? 0,
          status: (unit.status as UnitFormValues['status']) ?? 'available',
        }
      : {
          unit_type: 'tent',
          max_guests: 2,
          base_rate_usd: 0,
          status: 'available',
        },
  })

  async function onSubmit(values: UnitFormValues) {
    setLoading(true)
    try {
      const supabase = createClient()
      if (mode === 'add') {
        const { error } = await supabase.from('units').insert({
          ...values,
          property_id: propertyId,
        })
        if (error) throw error
        toast.success('Unit added')
      } else if (unit) {
        const { error } = await supabase.from('units').update(values).eq('id', unit.id)
        if (error) throw error
        toast.success('Unit updated')
      }
      setOpen(false)
      reset()
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save unit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {mode === 'add' ? (
        <Button
          style={{ backgroundColor: '#1A5C38' }}
          className="text-white gap-2"
          onClick={() => setOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Add Unit
        </Button>
      ) : (
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add Unit' : 'Edit Unit'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Unit Name</Label>
            <Input placeholder="e.g. Tent 1, Room 3" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                defaultValue={unit?.unit_type ?? 'tent'}
                onValueChange={v => setValue('unit_type', v ?? 'tent')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {['tent', 'room', 'suite', 'banda', 'villa', 'treehouse', 'other'].map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Max Guests</Label>
              <Input
                type="number"
                min={1}
                max={50}
                {...register('max_guests', { valueAsNumber: true })}
              />
              {errors.max_guests && <p className="text-xs text-destructive">{errors.max_guests.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rate (USD/night)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                {...register('base_rate_usd', { valueAsNumber: true })}
              />
              {errors.base_rate_usd && <p className="text-xs text-destructive">{errors.base_rate_usd.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                defaultValue={unit?.status ?? 'available'}
                onValueChange={v => setValue('status', v as UnitFormValues['status'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['available', 'occupied', 'maintenance', 'blocked'].map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#1A5C38' }}
              className="text-white"
            >
              {loading ? 'Saving…' : 'Save Unit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
