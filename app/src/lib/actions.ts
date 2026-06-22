'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { db, PHOTOS_BUCKET } from './supabase'
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

  // Upload photos (up to 4 slots)
  for (let i = 0; i < 4; i++) {
    const file = formData.get(`photo_file_${i}`) as File | null
    if (!file || file.size === 0) continue

    const caption = (formData.get(`photo_caption_${i}`) as string) ?? ''
    const ext = file.name.split('.').pop() ?? 'jpg'
    const key = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await db.storage
      .from(PHOTOS_BUCKET)
      .upload(key, arrayBuffer, { contentType: file.type, upsert: false })

    if (uploadError) continue // best-effort: don't fail order creation for a photo error

    await db.from('order_photos').insert({
      order_id: id,
      storage_key: key,
      caption: caption || null,
      sort_order: i,
      uploaded_by: user.id,
    })
  }

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

  // ─── Status-change notifications ───────────────────────────────────────────

  if (newStatus === 'needs_changes') {
    // Email the submitting analyst
    const analyst = order.submitted_by
    if (analyst?.email) {
      const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const orderUrl = `${base}/orders/${orderId}`
      const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:24px;color:#0F2137">
        <div style="max-width:560px;margin:0 auto">
          <div style="background:#0B1829;border-radius:8px;padding:16px 20px;margin-bottom:20px">
            <span style="color:white;font-weight:700;font-size:16px">Sea Morris</span>
          </div>
          <h2 style="margin:0 0 8px;color:#B85C00">Changes Requested on Order ${orderId}</h2>
          <p style="color:#4D6B8A;margin:0 0 16px">Your scope order <strong style="color:#0F2137">${order.job_name}</strong> has been reviewed and requires changes before it can be approved.</p>
          ${note ? `<div style="background:#FFF3E6;border-left:4px solid #B85C00;padding:12px 16px;border-radius:4px;margin-bottom:16px;font-size:14px">${note}</div>` : ''}
          <a href="${orderUrl}" style="display:inline-block;background:#1355C2;color:white;text-decoration:none;padding:11px 22px;border-radius:7px;font-weight:600;font-size:14px">View Order &amp; Make Changes &rarr;</a>
          <p style="margin-top:24px;font-size:12px;color:#8BAAC4">Sea Morris Scope Orders &bull; This is an automated notification.</p>
        </div>
      </body></html>`
      await sendEmail(analyst.email, `Changes Requested — Order ${orderId} (${order.job_name})`, html)
    }
  }

  if (newStatus === 'submitted') {
    // Email account managers
    const { data: managers } = await db
      .from('users')
      .select('email, name')
      .eq('role', 'account_manager')
      .eq('is_active', true)

    if (managers?.length) {
      const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const orderUrl = `${base}/orders/${orderId}`
      const submitterName = order.submitted_by?.name ?? user.name
      const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:24px;color:#0F2137">
        <div style="max-width:560px;margin:0 auto">
          <div style="background:#0B1829;border-radius:8px;padding:16px 20px;margin-bottom:20px">
            <span style="color:white;font-weight:700;font-size:16px">Sea Morris</span>
          </div>
          <h2 style="margin:0 0 8px;color:#1355C2">New Order Submitted for Review</h2>
          <p style="color:#4D6B8A;margin:0 0 16px"><strong style="color:#0F2137">${submitterName}</strong> has submitted scope order <strong style="color:#0F2137">${orderId}</strong> for your review.</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
            <tr><td style="padding:8px 0;border-bottom:1px solid #D4E4F4;color:#4D6B8A;width:40%">Job</td><td style="padding:8px 0;border-bottom:1px solid #D4E4F4;font-weight:500">${order.job_name}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #D4E4F4;color:#4D6B8A">Client</td><td style="padding:8px 0;border-bottom:1px solid #D4E4F4;font-weight:500">${order.client_name}</td></tr>
            <tr><td style="padding:8px 0;color:#4D6B8A">Subcontractor</td><td style="padding:8px 0;font-weight:500">${order.subcontractor_name}</td></tr>
          </table>
          <a href="${orderUrl}" style="display:inline-block;background:#1355C2;color:white;text-decoration:none;padding:11px 22px;border-radius:7px;font-weight:600;font-size:14px">Review Order &rarr;</a>
          <p style="margin-top:24px;font-size:12px;color:#8BAAC4">Sea Morris Scope Orders &bull; This is an automated notification.</p>
        </div>
      </body></html>`

      await Promise.all(
        managers.map(mgr =>
          sendEmail(mgr.email, `Order ${orderId} Ready for Review — ${order.job_name}`, html)
        )
      )
    }
  }

  // ──────────────────────────────────────────────────────────────────────────

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

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function createUser(_prev: unknown, formData: FormData) {
  const currentUser = await getSessionUser()
  if (!currentUser || currentUser.role !== 'admin') {
    return { error: 'Admin access required.' }
  }

  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.toLowerCase().trim()
  const password = formData.get('password') as string
  const role = formData.get('role') as string

  if (!name || !email || !password || !role) {
    return { error: 'Name, email, password, and role are required.' }
  }

  const validRoles = ['operations_analyst', 'account_manager', 'admin']
  if (!validRoles.includes(role)) {
    return { error: 'Invalid role.' }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  // Check for existing user
  const { data: existing } = await db.from('users').select('id').eq('email', email).single()
  if (existing) return { error: 'A user with that email already exists.' }

  const password_hash = await bcrypt.hash(password, 12)
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const { error } = await db.from('users').insert({
    name,
    email,
    password_hash,
    role,
    avatar_initials: initials,
    is_active: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function setUserActive(userId: string, active: boolean) {
  const currentUser = await getSessionUser()
  if (!currentUser || currentUser.role !== 'admin') {
    return { error: 'Admin access required.' }
  }
  if (userId === currentUser.id) {
    return { error: 'You cannot deactivate your own account.' }
  }

  const { error } = await db.from('users').update({ is_active: active }).eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}
