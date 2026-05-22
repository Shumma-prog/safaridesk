'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Users,
  Building2,
  CreditCard,
  LogOut,
  Tent,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/bookings', label: 'Bookings', icon: BookOpen },
  { href: '/guests', label: 'Guests', icon: Users },
  { href: '/properties', label: 'Properties', icon: Building2 },
  { href: '/payments', label: 'Payments', icon: CreditCard },
]

interface SidebarProps {
  orgName: string
}

export function Sidebar({ orgName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen border-r bg-white">
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-5 border-b">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ backgroundColor: '#1A5C38' }}>
          <Tent className="w-4 h-4 text-white" />
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-semibold leading-tight truncate" style={{ color: '#1A5C38' }}>
            SafariDesk
          </p>
          <p className="text-xs text-muted-foreground truncate">{orgName}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              style={active ? { backgroundColor: '#1A5C38' } : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-2 pb-4">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
