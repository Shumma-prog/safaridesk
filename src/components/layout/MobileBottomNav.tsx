'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Users,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/bookings', label: 'Bookings', icon: BookOpen },
  { href: '/guests', label: 'Guests', icon: Users },
  { href: '/properties', label: 'Properties', icon: Building2 },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around h-16 border-t bg-white">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 px-2 py-1"
          >
            <Icon
              className={cn('w-5 h-5', active ? '' : 'text-muted-foreground')}
              style={active ? { color: '#1A5C38' } : undefined}
            />
            <span
              className={cn('text-[10px] font-medium', active ? '' : 'text-muted-foreground')}
              style={active ? { color: '#1A5C38' } : undefined}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
