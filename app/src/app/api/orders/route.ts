import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUser, canCreateOrders } from '@/lib/auth'
import { db } from '@/lib/supabase'
import { listOrders, nextOrderId, addAudit, statusCounts } from '@/lib/orders'

// ─── GET /api/orders ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? undefined
  const status = searchParams.get('status') ?? undefined
  const mine = searchParams.get('mine') === 'true'
  const counts = searchParams.get('counts') === 'true'

  if (counts) {
    const submittedById =
      user.role === 'operations_analyst' ? user.id : undefined
    const data = await statusCounts(submittedById)
    return NextResponse.json({ data })
  }

  const submittedById =
    user.role === 'operations_analyst' || mine ? user.id : undefined

  const orders = await listOrders({
    submittedById,
    status: status as any,
    search,
    limit: 100,
  })

  return NextResponse.json({ data: orders })
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────
const createSchema = z.object({
  job_name: z.string().min(1),
  client_name: z.string().min(1),
  client_email: z.string().email(),
  client_phone: z.string().optional(),
  property_address: z.string().optional(),
  subcontractor_name: z.string().min(1),
  account_manager_id: z.string().uuid().optional(),
  work_description: z.string().default(''),
  scope_reason: z.string().optional(),
  sub_cost: z.number().min(0),
  internal_notes: z.string().optional(),
  submit: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canCreateOrders(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const input = parsed.data
  const id = await nextOrderId()
  const status = input.submit ? 'submitted' : 'draft'

  const { data: order, error } = await db
    .from('orders')
    .insert({
      id,
      job_name: input.job_name,
      client_name: input.client_name,
      client_email: input.client_email,
      client_phone: input.client_phone ?? null,
      property_address: input.property_address ?? null,
      subcontractor_name: input.subcontractor_name,
      submitted_by_id: user.id,
      account_manager_id: input.account_manager_id ?? null,
      work_description: input.work_description,
      scope_reason: input.scope_reason ?? null,
      sub_cost: input.sub_cost,
      markup_pct: 20,
      internal_notes: input.internal_notes ?? null,
      status,
      date_submitted: status === 'submitted' ? new Date().toISOString().split('T')[0] : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await addAudit(id, user.id, user.name, 'created')
  if (input.submit) await addAudit(id, user.id, user.name, 'submitted')

  return NextResponse.json({ data: order }, { status: 201 })
}
