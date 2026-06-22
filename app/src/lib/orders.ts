import { db } from './supabase'
import type { Order, AuditEntry, AuditEvent, OrderStatus, Subcontractor, OrderNote, OrderTemplate } from '@/types'

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

// ─── Order Notes ─────────────────────────────────────────────────────────────

export async function getOrderNotes(orderId: string): Promise<OrderNote[]> {
  const { data } = await db
    .from('order_notes')
    .select('*, author:users!author_id(id,name,avatar_initials)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  return (data ?? []) as OrderNote[]
}

export async function addOrderNote(orderId: string, authorId: string, body: string): Promise<void> {
  await db.from('order_notes').insert({ order_id: orderId, author_id: authorId, body })
}

// ─── Report Metrics ───────────────────────────────────────────────────────────

export interface ReportMetrics {
  totalOrders: number
  totalValueSent: number
  totalValueApproved: number
  approvalRate: number
  byStatus: Record<string, { count: number; value: number }>
  topSubcontractors: { name: string; orderCount: number; totalSubCost: number; totalClientPrice: number }[]
  submittedBy: { name: string; orderCount: number; totalValue: number }[]
}

function dateRangeBounds(range: string): { start: string; end: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() // 0-based

  if (range === 'last_month') {
    const first = new Date(y, m - 1, 1)
    const last = new Date(y, m, 0)
    return { start: first.toISOString().slice(0, 10), end: last.toISOString().slice(0, 10) }
  }
  if (range === 'this_quarter') {
    const qStart = Math.floor(m / 3) * 3
    const first = new Date(y, qStart, 1)
    const last = new Date(y, qStart + 3, 0)
    return { start: first.toISOString().slice(0, 10), end: last.toISOString().slice(0, 10) }
  }
  if (range === 'this_year') {
    return { start: `${y}-01-01`, end: `${y}-12-31` }
  }
  // default: this_month
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)
  return { start: first.toISOString().slice(0, 10), end: last.toISOString().slice(0, 10) }
}

export async function reportMetrics(range: string): Promise<ReportMetrics> {
  const { start, end } = dateRangeBounds(range)

  const { data: rows } = await db
    .from('orders')
    .select('status,client_price,sub_cost,subcontractor_name,submitted_by_id,date_submitted,created_at,submitted_by:users!submitted_by_id(id,name)')
    .gte('created_at', `${start}T00:00:00.000Z`)
    .lte('created_at', `${end}T23:59:59.999Z`)

  const orders = rows ?? []

  let totalValueSent = 0
  let totalValueApproved = 0
  let clientApproved = 0
  let clientDeclined = 0
  const byStatus: Record<string, { count: number; value: number }> = {}
  const subMap: Record<string, { orderCount: number; totalSubCost: number; totalClientPrice: number }> = {}
  const userMap: Record<string, { name: string; orderCount: number; totalValue: number }> = {}

  for (const row of orders) {
    const price = Number(row.client_price ?? 0)
    const cost = Number(row.sub_cost ?? 0)
    const st = row.status as string

    // by status
    if (!byStatus[st]) byStatus[st] = { count: 0, value: 0 }
    byStatus[st].count++
    byStatus[st].value += price

    if (st === 'sent_to_client' || st === 'client_approved' || st === 'client_declined') {
      totalValueSent += price
    }
    if (st === 'client_approved') {
      totalValueApproved += price
      clientApproved++
    }
    if (st === 'client_declined') clientDeclined++

    // subcontractor
    const subName = (row.subcontractor_name as string) ?? 'Unknown'
    if (!subMap[subName]) subMap[subName] = { orderCount: 0, totalSubCost: 0, totalClientPrice: 0 }
    subMap[subName].orderCount++
    subMap[subName].totalSubCost += cost
    subMap[subName].totalClientPrice += price

    // submitted by
    const submitterRaw = row.submitted_by as unknown
    const submitter = submitterRaw && typeof submitterRaw === 'object' && !Array.isArray(submitterRaw)
      ? (submitterRaw as { id: string; name: string })
      : null
    if (submitter) {
      if (!userMap[submitter.id]) userMap[submitter.id] = { name: submitter.name, orderCount: 0, totalValue: 0 }
      userMap[submitter.id].orderCount++
      userMap[submitter.id].totalValue += price
    }
  }

  const total = clientApproved + clientDeclined
  const approvalRate = total > 0 ? Math.round((clientApproved / total) * 100) : 0

  const topSubcontractors = Object.entries(subMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.totalClientPrice - a.totalClientPrice)
    .slice(0, 10)

  const submittedBy = Object.values(userMap)
    .sort((a, b) => b.orderCount - a.orderCount)

  return {
    totalOrders: orders.length,
    totalValueSent,
    totalValueApproved,
    approvalRate,
    byStatus,
    topSubcontractors,
    submittedBy,
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function listTemplates(): Promise<OrderTemplate[]> {
  const { data } = await db
    .from('order_templates')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as OrderTemplate[]
}

// List active subcontractors ordered by name
export async function listSubcontractors(): Promise<Subcontractor[]> {
  const { data } = await db
    .from('subcontractors')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true })
  return (data ?? []) as Subcontractor[]
}

// List all subcontractors (admin)
export async function listAllSubcontractors(): Promise<Subcontractor[]> {
  const { data } = await db
    .from('subcontractors')
    .select('*')
    .order('name', { ascending: true })
  return (data ?? []) as Subcontractor[]
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
