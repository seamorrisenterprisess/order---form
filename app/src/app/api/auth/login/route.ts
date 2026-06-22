import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/supabase'
import { signToken, setSessionCookie } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { email, password } = parsed.data

  const { data: user } = await db
    .from('users')
    .select('id, email, name, role, avatar_initials, is_active, password_hash, created_at')
    .eq('email', email.toLowerCase())
    .eq('is_active', true)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const token = await signToken(user.id)
  const { password_hash: _, ...safeUser } = user

  const res = NextResponse.json({ data: { user: safeUser, token } })
  const cookie = setSessionCookie(token)
  res.cookies.set(cookie)
  return res
}
