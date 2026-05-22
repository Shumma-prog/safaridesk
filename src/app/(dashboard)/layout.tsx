import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopNav } from '@/components/layout/TopNav'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch org name for display
  const { data: member } = await supabase
    .from('org_members')
    .select('organizations(name)')
    .eq('user_id', user.id)
    .single()

  const orgRaw = member?.organizations as unknown
  const orgName: string =
    Array.isArray(orgRaw)
      ? (orgRaw[0] as { name: string })?.name ?? 'My Property'
      : (orgRaw as { name: string } | null)?.name ?? 'My Property'

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar orgName={orgName} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav userEmail={user.email ?? ''} orgName={orgName} />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
