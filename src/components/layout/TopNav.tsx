'use client'

import { Bell } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface TopNavProps {
  userEmail: string
  orgName: string
}

function initials(email: string) {
  const [local] = email.split('@')
  return local.slice(0, 2).toUpperCase()
}

export function TopNav({ userEmail, orgName }: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 md:px-6 border-b bg-white">
      {/* Left — page breadcrumb area (children could be injected) */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground md:hidden">{orgName}</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
        </Button>
        <Avatar className="w-8 h-8">
          <AvatarFallback
            className="text-xs text-white"
            style={{ backgroundColor: '#1A5C38' }}
          >
            {initials(userEmail)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
