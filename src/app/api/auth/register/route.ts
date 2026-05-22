import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const schema = z.object({
  userId: z.string().uuid(),
  orgName: z.string().min(2),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { userId, orgName } = parsed.data

    // Insert organization using service role — bypasses RLS
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ name: orgName })
      .select()
      .single()

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 400 })
    }

    // Insert org member
    const { error: memberError } = await supabaseAdmin
      .from('org_members')
      .insert({ org_id: org.id, user_id: userId, role: 'owner' })

    if (memberError) {
      // Roll back the org we just created
      await supabaseAdmin.from('organizations').delete().eq('id', org.id)
      return NextResponse.json({ error: memberError.message }, { status: 400 })
    }

    return NextResponse.json({ org_id: org.id }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
