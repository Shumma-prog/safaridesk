'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal } from 'lucide-react'
import type { Booking } from '@/types/database'

const nextStatus: Record<string, string> = {
  enquiry: 'confirmed',
  confirmed: 'checked_in',
  checked_in: 'checked_out',
}

const statusLabel: Record<string, string> = {
  confirmed: 'Mark Confirmed',
  checked_in: 'Check In',
  checked_out: 'Check Out',
}

interface Props {
  booking: Pick<Booking, 'id' | 'status' | 'booking_ref'>
}

export function BookingActions({ booking }: Props) {
  const router = useRouter()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const next = nextStatus[booking.status]

  async function updateStatus(status: string) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('bookings').update({ status }).eq('id', booking.id)
      if (error) throw error
      toast.success(`Booking ${status.replace('_', ' ')}`)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  async function cancelBooking() {
    await updateStatus('cancelled')
    setCancelOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={loading}>
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {next && (
            <DropdownMenuItem onClick={() => updateStatus(next)}>
              {statusLabel[next] ?? next}
            </DropdownMenuItem>
          )}
          {booking.status !== 'cancelled' && booking.status !== 'checked_out' && (
            <>
              {next && <DropdownMenuSeparator />}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setCancelOpen(true)}
              >
                Cancel Booking
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Cancel booking {booking.booking_ref}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={cancelBooking}
              className="bg-destructive text-white"
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
