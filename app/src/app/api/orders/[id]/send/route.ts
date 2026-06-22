import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUser, canReviewOrders } from '@/lib/auth'
import { db } from '@/lib/supabase'
import { getOrder, addAudit } from '@/lib/orders'
import { buildEmailHtml, buildSmsText, sendEmail, sendSms } from '@/lib/email'

const schema = z.object({ channel: z.enum(['email', 'sms']) })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canReviewOrders(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const order = await getOrder(id)
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (order.status !== 'approved_internally' && order.status !== 'sent_to_client') {
    return NextResponse.json(
      { error: 'Order must be approved before sending to client' },
      { status: 422 }
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { channel } = parsed.data
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.seamorris.com'
  const approveUrl = `${baseUrl}/client/${order.client_token}?action=approve`
  const declineUrl = `${baseUrl}/client/${order.client_token}?action=decline`

  let result
  if (channel === 'email') {
    const html = buildEmailHtml(order, approveUrl, declineUrl)
    result = await sendEmail(
      order.client_email,
      `Additional Work Authorization – ${order.job_name}`,
      html
    )
  } else {
    const text = buildSmsText(order, approveUrl)
    result = await sendSms(order.client_phone ?? order.client_email, text)
  }

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Send failed' }, { status: 500 })
  }

  // Transition to sent_to_client
  await db.from('orders').update({ status: 'sent_to_client' }).eq('id', id)
  const event = channel === 'email' ? 'sent_email' : 'sent_sms'
  await addAudit(id, user.id, user.name, event, undefined, {
    to: order.client_email,
    messageId: result.messageId,
  })

  return NextResponse.json({ data: { sent: true, channel, messageId: result.messageId } })
}
