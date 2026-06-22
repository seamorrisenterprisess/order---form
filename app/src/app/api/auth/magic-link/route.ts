import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : null

  // Always return 200 — don't reveal whether email exists
  if (!email) {
    return NextResponse.json({ ok: true })
  }

  // Look up user by email
  const { data: user } = await db
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('is_active', true)
    .single()

  if (!user) {
    return NextResponse.json({ ok: true })
  }

  // Rate limit: skip if a link was created in the last 2 minutes
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const { data: recent } = await db
    .from('magic_links')
    .select('id')
    .eq('user_id', user.id)
    .gte('created_at', twoMinutesAgo)
    .limit(1)
    .single()

  if (recent) {
    return NextResponse.json({ ok: true })
  }

  // Create magic link row
  const { data: magicLink } = await db
    .from('magic_links')
    .insert({ user_id: user.id })
    .select('token')
    .single()

  if (!magicLink) {
    return NextResponse.json({ ok: true })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const link = `${appUrl}/auth/verify?token=${magicLink.token}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Sign in to Sea Morris</title></head>
<body style="margin:0;padding:0;background:#F4F8FF;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
  <tr><td style="background:#0B1829;padding:20px 28px">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#1355C2;border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle">
        <span style="color:white;font-size:15px;font-weight:700">SM</span>
      </td>
      <td style="padding-left:10px;color:white;font-size:16px;font-weight:600">Sea Morris</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:32px 28px">
    <h1 style="margin:0 0 10px;font-size:22px;color:#0B1829">Sign in to Sea Morris</h1>
    <p style="margin:0 0 24px;color:#4D6B8A;font-size:14px;line-height:1.6">
      Click the button below to sign in. This link expires in 15 minutes and can only be used once.
    </p>
    <a href="${link}" style="display:inline-block;background:#1355C2;color:white;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:700;font-size:14px">
      Sign In to Sea Morris
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#8BAAC4">
      If you did not request this link, you can safely ignore this email.
    </p>
  </td></tr>
  <tr><td style="background:#F4F8FF;padding:14px 28px;border-top:1px solid #D4E4F4">
    <p style="margin:0;font-size:11px;color:#8BAAC4;text-align:center">
      Sea Morris Operations Platform &middot; (512) 555-0100
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`

  await sendEmail(email, 'Sign in to Sea Morris', html)

  return NextResponse.json({ ok: true })
}
