import { SupabaseClient } from '@supabase/supabase-js'

export async function generateBookingRef(supabase: SupabaseClient): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
  const seq = String((count || 0) + 1).padStart(4, '0')
  return `SD-${year}-${seq}`
}
