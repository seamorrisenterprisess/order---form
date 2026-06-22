import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/supabase'
import { getOrderByToken, addAudit } from '@/lib/orders'

const schema = z.object({
  token: z.string(),
  approved: z.boolean(),
  note: z.string().optional(),
})

// Public endpoint — authenticated by client_token, not session cookie
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { token, approved, note } = parsed.data
  const order = await getOrderByToken(token)

  if (!order || order.id !== id)
    return NextResponse.json({ error: 'Invalid link' }, { status: 404 })

  if (order.status !== 'sent_to_client') {
    return NextResponse.json(
      { error: 'This order has already been responded to.' },
      { status: 422 }
    )
  }

  const newStatus = approved ? 'client_approved' : 'client_declined'

  await db.from('orders').update({
    status: newStatus,
    client_responded_at: new Date().toISOString(),
  }).eq('id', id)

  const event = approved ? 'client_approved' : 'client_declined'
  await addAudit(id, null, order.client_name, event, note)

  return NextResponse.json({ data: { status: newStatus } })
}
