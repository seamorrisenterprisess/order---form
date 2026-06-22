import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUser, ALLOWED_TRANSITIONS } from '@/lib/auth'
import { db } from '@/lib/supabase'
import { getOrder, addAudit } from '@/lib/orders'
import type { AuditEvent, OrderStatus } from '@/types'

const schema = z.object({
  status: z.enum([
    'draft', 'submitted', 'needs_changes', 'approved_internally',
    'sent_to_client', 'client_approved', 'client_declined',
  ]),
  note: z.string().optional(),
})

// Maps status transitions to audit events
const transitionEvent: Partial<Record<string, AuditEvent>> = {
  submitted: 'submitted',
  needs_changes: 'changes_requested',
  approved_internally: 'approved',
  client_declined: 'rejected',
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const order = await getOrder(id)
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { status: newStatus, note } = parsed.data
  const allowed = ALLOWED_TRANSITIONS[user.role]?.[order.status] ?? []

  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${order.status} to ${newStatus} as ${user.role}` },
      { status: 422 }
    )
  }

  const updates: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'needs_changes' && note) updates.change_request_note = note
  if (newStatus === 'submitted') {
    updates.date_submitted = new Date().toISOString().split('T')[0]
    updates.change_request_note = null
  }

  const { error } = await db.from('orders').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const event: AuditEvent = transitionEvent[newStatus] ?? 'reviewed'
  await addAudit(id, user.id, user.name, event, note)

  return NextResponse.json({ data: { id, status: newStatus } })
}
