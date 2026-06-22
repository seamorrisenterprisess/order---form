import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/supabase'
import { getOrder, addAudit } from '@/lib/orders'

// ─── GET /api/orders/[id] ─────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const order = await getOrder(id)
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Analysts can only view their own orders
  if (user.role === 'operations_analyst' && order.submitted_by_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ data: order })
}

// ─── PATCH /api/orders/[id] ───────────────────────────────────────────────────
const patchSchema = z.object({
  job_name: z.string().optional(),
  client_name: z.string().optional(),
  client_email: z.string().email().optional(),
  client_phone: z.string().optional(),
  property_address: z.string().optional(),
  subcontractor_name: z.string().optional(),
  account_manager_id: z.string().uuid().nullable().optional(),
  work_description: z.string().optional(),
  scope_reason: z.string().optional(),
  sub_cost: z.number().min(0).optional(),
  markup_pct: z.number().min(0).max(100).optional(),
  internal_notes: z.string().optional(),
  client_message: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const order = await getOrder(id)
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Analysts can only edit their own draft/needs_changes orders
  if (user.role === 'operations_analyst') {
    if (order.submitted_by_id !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!['draft', 'needs_changes'].includes(order.status))
      return NextResponse.json({ error: 'Order cannot be edited in its current status' }, { status: 422 })
  }

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updates = parsed.data
  const isPricingUpdate = updates.sub_cost !== undefined || updates.markup_pct !== undefined
  const isMessageUpdate = updates.client_message !== undefined

  const { data: updated, error } = await db
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (isPricingUpdate) await addAudit(id, user.id, user.name, 'pricing_updated')
  if (isMessageUpdate) await addAudit(id, user.id, user.name, 'message_updated')

  return NextResponse.json({ data: updated })
}
