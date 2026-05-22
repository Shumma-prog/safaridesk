export type OrgType =
  | 'lodge' | 'tented_camp' | 'hotel' | 'boutique_hotel' | 'guesthouse' | 'tour_operator'

export type UnitType =
  | 'tent' | 'room' | 'suite' | 'banda' | 'villa' | 'treehouse' | 'cottage' | 'dormitory' | 'other'

export type UnitStatus = 'available' | 'occupied' | 'maintenance' | 'blocked'

export type BookingStatus =
  | 'enquiry' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'

export type PaymentMethod =
  | 'stripe' | 'mpesa' | 'bank_transfer' | 'cash' | 'card'

export type PaymentState = 'pending' | 'completed' | 'failed' | 'refunded'

export type BookingSource =
  | 'direct' | 'whatsapp' | 'email' | 'booking_com'
  | 'airbnb' | 'expedia' | 'agent' | 'phone' | 'walk_in' | 'other'

export type OrgRole = 'owner' | 'manager' | 'staff' | 'agent'

export interface Organization {
  id: string
  name: string
  type: OrgType | null
  plan: string
  owner_id: string | null
  email: string | null
  phone: string | null
  location: string | null
  country: string
  currency: string
  logo_url: string | null
  stripe_account: string | null
  mpesa_shortcode: string | null
  timezone: string
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  org_id: string
  name: string
  property_type: OrgType | null
  description: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  images: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Unit {
  id: string
  org_id: string
  property_id: string
  name: string
  unit_type: UnitType | null
  max_guests: number | null
  base_rate_usd: number | null
  base_rate_tzs: number | null
  status: UnitStatus
  description: string | null
  amenities: string[]
  images: string[]
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Guest {
  id: string
  org_id: string
  full_name: string
  email: string | null
  phone: string | null
  nationality: string | null
  passport_number: string | null
  date_of_birth: string | null
  notes: string | null
  tags: string[]
  is_vip: boolean
  total_stays: number
  total_spent_usd: number
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  booking_ref: string
  org_id: string
  property_id: string | null
  unit_id: string | null
  guest_id: string | null
  check_in: string
  check_out: string
  nights: number
  adults: number
  children: number
  status: BookingStatus
  payment_status: PaymentStatus
  total_usd: number | null
  total_tzs: number | null
  paid_usd: number
  currency: string
  source: BookingSource
  agent_name: string | null
  agent_commission: number
  special_requests: string | null
  internal_notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined relations (optional)
  guests?: Guest | null
  units?: (Unit & { properties?: Property | null }) | null
  payments?: Payment[]
}

export interface Payment {
  id: string
  booking_id: string
  org_id: string
  amount_usd: number
  amount_tzs: number | null
  currency: string
  method: PaymentMethod
  status: PaymentState
  stripe_payment_id: string | null
  stripe_link_id: string | null
  mpesa_checkout_id: string | null
  mpesa_receipt: string | null
  mpesa_phone: string | null
  reference: string | null
  notes: string | null
  paid_at: string | null
  created_at: string
}

export interface BlockedDate {
  id: string
  unit_id: string
  org_id: string
  date: string
  reason: string | null
  created_at: string
}

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: OrgRole
  created_at: string
  // Joined
  organizations?: Organization | null
}

export type CreateBookingInput = {
  unit_id: string
  guest_id?: string
  new_guest?: {
    full_name: string
    email?: string
    phone?: string
    nationality?: string
  }
  check_in: string
  check_out: string
  adults: number
  children: number
  total_usd: number
  total_tzs: number
  currency: 'USD' | 'TZS'
  source: BookingSource
  agent_name?: string
  agent_commission?: number
  special_requests?: string
}

export type DashboardStats = {
  occupancy_rate: number
  revenue_this_month_usd: number
  arrivals_today: number
  departures_today: number
  bookings_this_month: number
  outstanding_balance_usd: number
}
