import { db } from './supabase'
import type { Order, AuditEntry, AuditEvent, OrderStatus } from '@/types'

// Fetch a single order with joined relations
export async function getOrder(id: string): Promise<Order | null> {
  const { data: order } = await db
    .from('orders')
    .select(`
      *,
      submitted_by:users!submitted_by_id(id,name,email,role,avatar_initials),
      account_manager:users!account_manager_id(id,name,email,role,avatar_initials),
      photos:order_photos(id,storage_key,caption,sort_order,created_at)
    `)
    .eq('id', id)
    .single()

  if (!order) return null

  const { data: trail } = await db
    .from('audit_trail')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: true })

  return { ...order, audit_trail: trail ?? [] } as Order
}

// List orders with optional filters
export async function listOrders(opts: {
  submittedById?: string
  status?: OrderStatus | OrderStatus[]
  search?: string
  limit?: number
  offset?: number
}): Promise<Order[]> {
  let query = db
    .from('orders')
    .select(`
      *,
      submitted_by:users!submitted_by_id(id,name,email,role,avatar_initials),
      account_manager:users!account_manager_id(id,name,email,role,avatar_initials)
    `)
    .order('created_at', { ascending: false })

  if (opts.submittedById) query = query.eq('submitted_by_id', opts.submittedById)
  if (opts.status) {
    if (Array.isArray(opts.status)) query = query.in('status', opts.status)
    else query = query.eq('status', opts.status)
  }
  if (opts.search) {
    query = query.or(
      `job_name.ilike.%${opts.search}%,client_name.ilike.%${opts.search}%,subcontractor_name.ilike.%${opts.search}%,id.ilike.%${opts.search}%`
    )
  }
  if (opts.limit) query = query.limit(opts.limit)
  if (opts.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1)

  const { data } = await query
  return (data ?? []) as Order[]
}

// Next available order ID
export async function nextOrderId(): Promise<string> {
  const { data } = await db.rpc('next_order_id')
  return data as string
}

// Append an audit entry
export async function addAudit(
  orderId: string,
  actorId: string | null,
  actorName: string,
  event: AuditEvent,
  note?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.from('audit_trail').insert({
    order_id: orderId,
    actor_id: actorId,
    actor_name: actorName,
    event,
    note: note ?? null,
    metadata: metadata ?? null,
  })
}

// Count orders by status (for dashboard cards)
export async function statusCounts(submittedById?: string): Promise<Record<string, number>> {
  let query = db.from('orders').select('status')
  if (submittedById) query = query.eq('submitted_by_id', submittedById)
  const { data } = await query

  const counts: Record<string, number> = {
    draft: 0, submitted: 0, needs_changes: 0,
    approved_internally: 0, sent_to_client: 0,
    client_approved: 0, client_declined: 0,
  }
  for (const row of data ?? []) {
    if (counts[row.status] !== undefined) counts[row.status]++
  }
  return counts
}

export interface PipelineMetrics {
  revenueByStatus: Record<string, number>
  thisMonth: {
    submitted: number
    sentToClientValue: number
    clientApprovedValue: number
  }
}

// Revenue pipeline metrics for dashboard
export async function pipelineMetrics(submittedById?: string): Promise<PipelineMetrics> {
  let query = db.from('orders').select('status,client_price,date_submitted,created_at')
  if (submittedById) query = query.eq('submitted_by_id', submittedById)
  const { data } = await query

  const rows = data ?? []
  const revenueByStatus: Record<string, number> = {
    submitted: 0,
    approved_internally: 0,
    sent_to_client: 0,
    client_approved: 0,
  }

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  let thisMonthSubmitted = 0
  let sentToClientValue = 0
  let clientApprovedValue = 0

  for (const row of rows) {
    const price = Number(row.client_price ?? 0)
    if (revenueByStatus[row.status] !== undefined) {
      revenueByStatus[row.status] += price
    }
    const dateKey = row.date_submitted ?? row.created_at?.slice(0, 10) ?? ''
    if (dateKey >= monthStart) {
      if (row.status === 'submitted' || row.status === 'needs_changes' || row.status === 'approved_internally' || row.status === 'sent_to_client' || row.status === 'client_approved' || row.status === 'client_declined') {
        thisMonthSubmitted++
      }
      if (row.status === 'sent_to_client' || row.status === 'client_approved' || row.status === 'client_declined') {
        sentToClientValue += price
      }
      if (row.status === 'client_approved') {
        clientApprovedValue += price
      }
    }
  }

  return {
    revenueByStatus,
    thisMonth: {
      submitted: thisMonthSubmitted,
      sentToClientValue,
      clientApprovedValue,
    },
  }
}

// Get order by client token (for client portal — no auth required)
export async function getOrderByToken(token: string): Promise<Order | null> {
  const { data: order } = await db
    .from('orders')
    .select(`*, photos:order_photos(id,storage_key,caption,sort_order)`)
    .eq('client_token', token)
    .single()

  if (!order) return null

  // Resolve photo public URLs
  if (order.photos?.length) {
    order.photos = order.photos.map((p: { storage_key: string; [key: string]: unknown }) => ({
      ...p,
      public_url: db.storage.from('order-photos').getPublicUrl(p.storage_key).data.publicUrl,
    }))
  }

  return order as Order
}
