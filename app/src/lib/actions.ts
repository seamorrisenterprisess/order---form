'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { db } from './supabase'
import { signToken, setSessionCookie, clearSessionCookie, getSessionUser, ALLOWED_TRANSITIONS } from './auth'
import { getOrder, addAudit, nextOrderId } from './orders'
import { buildEmailHtml, buildSmsText, sendEmail, sendSms } from './email'
import type { OrderStatus, AuditEvent } from '@/types'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(_prev: unknown, formData: FormData) {
  const email = (formData.get('email') as string)?.toLowerCase().trim()
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Email and password are required.' }

  const { data: user } = await db
    .from('users')
    .select('id, email, name, role, avatar_initials, is_active, password_hash')
    .eq('email', email)
    .eq('is_active', true)
    .single()

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return { error: 'Invalid email or password.' }
  }

  const token = await signToken(user.id)
  const jar = await cookies()
  jar.set(setSessionCookie(token))

  redirect('/dashboard')
}

export async function logout() {
  const jar = await cookies()
  jar.set(clearSessionCookie())
  redirect('/login')
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(_prev: unknown, formData: FormData) {
  const user = await getSessionUser()
  if (!user) return { error: 'Not authenticated.' }

  const submit = formData.get('submit') === 'true'

  const jobName = (formData.get('job_name') as string)?.trim()
  const clientName = (formData.get('client_name') as string)?.trim()
  const clientEmail = (formData.get('client_email') as string)?.trim()
  const subName = (formData.get('subcontractor_name') as string)?.trim()
  const workDesc = (formData.get('work_description') as string)?.trim() ?? ''
  const subCost = parseFloat(formData.get('sub_cost') as string) || 0

  if (!jobName || !clientName || !clientEmail || !subName) {
    return { error: 'Job name, client name, client email, and subcontractor are required.' }
  }

  const id = await nextOrderId()
  const status: OrderStatus = submit ? 'submitted' : 'draft'

  const { error } = await db.from('orders').insert({
    id,
    job_name: jobName,
    client_name: clientName,
    client_email: clientEmail,
    client_phone: (formData.get('client_phone') as string) || null,
    property_address: (formData.get('property_address') as string) || null,
    subcontractor_name: subName,
    submitted_by_id: user.id,
    account_manager_id: (formData.get('account_manager_id') as string) || null,
    work_description: workDesc,
    scope_reason: (formData.get('scope_reason') as string) || null,
    sub_cost: subCost,
    markup_pct: 20,
    internal_notes: (formData.get('internal_notes') as string) || null,
    status,
    date_submitted: submit ? new Date().toISOString().split('T')[0] : null,
  })

  if (error) return { error: error.message }

  await addAudit(id, user.id, user.name, 'created')
  if (submit) await addAudit(id, user.id, user.name, 'submitted')

  redirect(`/orders/${id}`)
}

export async function updatePricing(_prev: unknown, formData: FormData) {
  const user = await getSessionUser()
  if (!user) return { error: 'Not authenticated.' }

  const orderId = formData.get('order_id') as string
  const subCost = parseFloat(formData.get('sub_cost') as string) || 0
  const markupPct = parseFloat(formData.get('markup_pct') as string) || 0
  const clientMessage = (formData.get('client_message') as string)?.trim() ?? ''
  const internalNotes = (formData.get('internal_notes') as string)?.trim() ?? ''

  const { error } = await db.from('orders').update({
    sub_cost: subCost,
    markup_pct: markupPct,
    client_message: clientMessage,
    internal_notes: internalNotes,
  }).eq('id', orderId)

  if (error) return { error: error.message }

  await addAudit(orderId, user.id, user.name, 'pricing_updated',
    `Updated pricing: sub cost $${subCost}, markup ${markupPct}%`)

  revalidatePath(`/orders/${orderId}`)
  return { success: true }
}

export async function transitionStatus(orderId: string, newStatus: OrderStatus, note?: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'Not authenticated.' }

  const order = await getOrder(orderId)
  if (!order) return { error: 'Order not found.' }

  const allowed = ALLOWED_TRANSITIONS[user.role]?.[order.status] ?? []
  if (!allowed.includes(newStatus)) {
    return { error: `Cannot move from ${order.status} to ${newStatus}.` }
  }

  const updates: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'needs_changes' && note) updates.change_request_note = note
  if (newStatus === 'submitted') {
    updates.date_submitted = new Date().toISOString().split('T')[0]
    updates.change_request_note = null
  }

  const { error } = await db.from('orders').update(updates).eq('id', orderId)
  if (error) return { error: error.message }

  const eventMap: Partial<Record<string, AuditEvent>> = {
    submitted: 'submitted',
    needs_changes: 'changes_requested',
    approved_internally: 'approved',
    client_declined: 'rejected',
  }
  const event: AuditEvent = eventMap[newStatus] ?? 'reviewed'
  await addAudit(orderId, user.id, user.name, event, note)

  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function sendToClient(orderId: string, channel: 'email' | 'sms') {
  const user = await getSessionUser()
  if (!user) return { error: 'Not authenticated.' }

  const order = await getOrder(orderId)
  if (!order) return { error: 'Order not found.' }

  if (!['approved_internally', 'sent_to_client'].includes(order.status)) {
    return { error: 'Order must be approved before sending.' }
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const approveUrl = `${base}/client/${order.client_token}?action=approve`
  const declineUrl = `${base}/client/${order.client_token}?action=decline`

  let result
  if (channel === 'email') {
    const html = buildEmailHtml(order, approveUrl, declineUrl)
    result = await sendEmail(order.client_email, `Additional Work Authorization – ${order.job_name}`, html)
  } else {
    const text = buildSmsText(order, approveUrl)
    result = await sendSms(order.client_phone ?? order.client_email, text)
  }

  if (!result.success) return { error: result.error ?? 'Send failed.' }

  await db.from('orders').update({ status: 'sent_to_client' }).eq('id', orderId)
  await addAudit(orderId, user.id, user.name, channel === 'email' ? 'sent_email' : 'sent_sms',
    undefined, { to: order.client_email, messageId: result.messageId })

  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/dashboard')
  return { success: true, messageId: result.messageId }
}
