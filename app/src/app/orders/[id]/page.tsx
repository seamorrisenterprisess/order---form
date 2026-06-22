import { AppShell } from '@/components/AppShell'
import { StatusBadge } from '@/components/StatusBadge'
import { getSessionUser } from '@/lib/auth'
import { getOrder } from '@/lib/orders'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ReviewActions } from './ReviewActions'
import type { Order, OrderStatus } from '@/types'

function fmt(n: number) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })
}

const PIPELINE: { key: string; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'needs_changes', label: 'Changes' },
  { key: 'approved_internally', label: 'Approved' },
  { key: 'sent_to_client', label: 'Sent' },
  { key: 'client_response', label: 'Client Response' },
]

function getPipelineIdx(status: OrderStatus) {
  const map: Record<string, number> = {
    draft: 0, submitted: 1, needs_changes: 2,
    approved_internally: 3, sent_to_client: 4,
    client_approved: 5, client_declined: 5,
  }
  return map[status] ?? 0
}

function Pipeline({ status }: { status: OrderStatus }) {
  const idx = getPipelineIdx(status)
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
      {PIPELINE.map((step, i) => {
        const done = i < idx
        const active = i === idx
        return (
          <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, position: 'relative' }}>
            {i < PIPELINE.length - 1 && (
              <div style={{ position: 'absolute', left: 'calc(50% + 14px)', right: 'calc(-50% + 14px)', top: '14px', height: '2px', background: done ? '#1355C2' : '#D4E4F4', zIndex: 0 }} />
            )}
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', zIndex: 1, position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, flexShrink: 0,
              background: done ? '#1355C2' : active ? 'white' : '#F4F8FF',
              border: done ? '2px solid #1355C2' : active ? '2px solid #1355C2' : '2px solid #D4E4F4',
              color: done ? 'white' : active ? '#1355C2' : '#8BAAC4',
              boxShadow: active ? '0 0 0 4px rgba(19,85,194,0.12)' : 'none',
            }}>
              {done ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: done || active ? '#0F2137' : '#8BAAC4', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', whiteSpace: 'nowrap' }}>
              {step.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function InfoBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div style={{ background: 'white', borderRadius: '10px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>{title}</div>
      {rows.map(([k, v]) => v ? (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: '1px solid #F4F7FA' }}>
          <span style={{ color: '#4D6B8A' }}>{k}</span>
          <span style={{ fontWeight: 500, color: '#0F2137', textAlign: 'right', maxWidth: '60%' }}>{v}</span>
        </div>
      ) : null)}
    </div>
  )
}

const PHOTO_COLORS = [
  'linear-gradient(135deg,#C8DFF8,#93C6EE)',
  'linear-gradient(135deg,#B7D9C4,#7CBFA2)',
  'linear-gradient(135deg,#F0C070,#E8A030)',
  'linear-gradient(135deg,#C4A8E8,#9B72D0)',
]
const PHOTO_CAPTIONS = ['Overview of affected area', 'Close-up detail', 'Full scope area', 'Before work began']

const AUDIT_COLORS: Record<string, string> = {
  created: '#8BAAC4', submitted: '#1355C2', resubmitted: '#1355C2', reviewed: '#1355C2',
  approved: '#0D7A4E', sent_email: '#0D7A4E', sent_sms: '#0D7A4E',
  client_approved: '#0D7A4E', changes_requested: '#B85C00', rejected: '#C0392B', client_declined: '#C0392B',
  pricing_updated: '#4D6B8A', message_updated: '#4D6B8A',
}
const AUDIT_LABELS: Record<string, string> = {
  created: 'Created order', submitted: 'Submitted for review', resubmitted: 'Resubmitted',
  reviewed: 'Reviewed', approved: 'Approved internally', sent_email: 'Sent to client via email',
  sent_sms: 'Sent to client via SMS', client_approved: 'Client approved',
  changes_requested: 'Requested changes', rejected: 'Rejected', client_declined: 'Client declined',
  pricing_updated: 'Updated pricing', message_updated: 'Updated client message',
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const order = await getOrder(id)
  if (!order) notFound()

  if (user.role === 'operations_analyst' && order.submitted_by_id !== user.id) {
    redirect('/dashboard')
  }

  const isAM = user.role === 'account_manager' || user.role === 'admin'
  const isAnalyst = user.role === 'operations_analyst' || user.role === 'admin'
  const markupAmt = (order.client_price ?? 0) - (order.sub_cost ?? 0)

  return (
    <AppShell
      title={`${order.id} — ${order.job_name}`}
      actions={<Link href="/dashboard" style={{ padding: '7px 14px', border: '1.5px solid #D4E4F4', borderRadius: '7px', textDecoration: 'none', fontSize: '13px', color: '#4D6B8A', display: 'inline-flex' }}>← Back</Link>}
    >
      <div className="dot-grid" style={{ padding: '28px', minHeight: '100%' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', color: '#4D6B8A', marginBottom: '8px' }}>
              <Link href="/dashboard" style={{ color: '#1355C2', textDecoration: 'none' }}>Dashboard</Link> / {order.id}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '30px', color: '#0B1829', letterSpacing: '-0.02em' }}>{order.id}</div>
              <StatusBadge status={order.status} size="md" />
            </div>
            <div style={{ fontSize: '14px', color: '#4D6B8A' }}>{order.job_name}</div>
          </div>

          <Pipeline status={order.status} />

          {/* Change request banner */}
          {order.status === 'needs_changes' && order.change_request_note && (
            <div style={{ background: '#FFF3E6', border: '1px solid #f0c070', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', borderLeft: '4px solid #B85C00' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#B85C00', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
                ⚠ Changes Requested by {order.account_manager?.name ?? 'Account Manager'}
              </div>
              <div style={{ fontSize: '14px', color: '#0F2137', lineHeight: 1.6 }}>{order.change_request_note}</div>
            </div>
          )}

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <InfoBlock title="Job & Property" rows={[
              ['Job Name', order.job_name],
              ['Property', order.property_address ?? '—'],
              ['Subcontractor', order.subcontractor_name],
              ['Date Submitted', order.date_submitted ?? '—'],
            ]} />
            <InfoBlock title="People" rows={[
              ['Client', order.client_name],
              ['Client Email', order.client_email],
              ['Client Phone', order.client_phone ?? '—'],
              ['Submitted By', order.submitted_by?.name ?? '—'],
              ['Account Manager', order.account_manager?.name ?? 'Unassigned'],
            ]} />
          </div>

          {/* Scope */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4E4F4', fontWeight: 600, fontSize: '14px' }}>Scope of Work</div>
            <div style={{ padding: '20px' }}>
              <div style={{ fontSize: '14px', lineHeight: 1.7, color: '#0F2137', marginBottom: '12px' }}>
                {order.work_description || <em style={{ color: '#8BAAC4' }}>No description entered.</em>}
              </div>
              {order.scope_reason && (
                <div style={{ padding: '10px 14px', background: '#F4F8FF', borderRadius: '8px', borderLeft: '3px solid #8BAAC4', fontSize: '13px', color: '#4D6B8A' }}>
                  <strong style={{ color: '#0F2137' }}>Why additional scope:</strong> {order.scope_reason}
                </div>
              )}
            </div>
          </div>

          {/* Photos */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4E4F4', fontWeight: 600, fontSize: '14px' }}>Photos</div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                {[0,1,2,3].map(i => (
                  <div key={i}>
                    <div style={{ borderRadius: '8px', background: order.photos && i < order.photos.length ? PHOTO_COLORS[i] : '#F0F4F8', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                      {order.photos && i < order.photos.length ? '🖼' : '📷'}
                    </div>
                    <div style={{ fontSize: '11px', color: order.photos && i < order.photos.length ? '#4D6B8A' : '#D4E4F4', marginTop: '5px', fontWeight: 500 }}>
                      {order.photos && i < order.photos.length ? PHOTO_CAPTIONS[i] : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Financials */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>Financials</div>
            {[
              ['Subcontractor Cost', fmt(order.sub_cost)],
              ['Markup', `${order.markup_pct}%`],
              ['Markup Amount', `+${fmt(markupAmt)}`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F0F4F8', fontSize: '14px' }}>
                <span style={{ color: '#4D6B8A' }}>{k}</span>
                <span style={{ fontWeight: 600, color: k === 'Markup Amount' ? '#0D7A4E' : '#0F2137' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', marginTop: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F2137' }}>Final Client Price</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: '#1355C2' }}>{fmt(order.client_price)}</span>
            </div>
          </div>

          {/* Client message */}
          {order.client_message && (
            <div style={{ background: '#E8F2FD', borderRadius: '10px', padding: '16px 18px', borderLeft: '3px solid #2990FF', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>✉ Client-Facing Message</div>
              <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#0F2137' }}>{order.client_message}</div>
            </div>
          )}

          {/* Internal notes */}
          {order.internal_notes && (
            <div style={{ background: '#FFF3E6', borderRadius: '10px', padding: '16px 18px', borderLeft: '3px solid #B85C00', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#B85C00', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>🔒 Internal Notes</div>
              <div style={{ fontSize: '14px', lineHeight: 1.6 }}>{order.internal_notes}</div>
            </div>
          )}

          {/* AM Review Actions */}
          {isAM && <ReviewActions order={order} />}

          {/* Analyst re-submit */}
          {isAnalyst && (order.status === 'draft' || order.status === 'needs_changes') && (
            <form action={async (fd: FormData) => {
              'use server'
              const { transitionStatus } = await import('@/lib/actions')
              await transitionStatus(id, 'submitted')
            }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button type="submit" style={{ padding: '9px 20px', background: '#1355C2', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '13.5px', cursor: 'pointer' }}>
                  {order.status === 'needs_changes' ? 'Resubmit →' : 'Submit to Account Manager →'}
                </button>
              </div>
            </form>
          )}

          {/* Audit Trail */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4E4F4', fontWeight: 600, fontSize: '14px' }}>Audit Trail</div>
            <div style={{ padding: '20px' }}>
              {(order.audit_trail ?? []).map((entry, i) => (
                <div key={entry.id} style={{ display: 'flex', gap: '14px', paddingBottom: i < (order.audit_trail?.length ?? 0) - 1 ? '20px' : 0, position: 'relative' }}>
                  {i < (order.audit_trail?.length ?? 0) - 1 && (
                    <div style={{ position: 'absolute', left: '13px', top: '28px', bottom: 0, width: '2px', background: '#D4E4F4' }} />
                  )}
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, zIndex: 1,
                    background: AUDIT_COLORS[entry.event] ?? '#8BAAC4',
                    border: '2px solid white', boxShadow: '0 0 0 2px #D4E4F4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', color: 'white', fontWeight: 700,
                  }}>●</div>
                  <div style={{ flex: 1, paddingTop: '4px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F2137' }}>{entry.actor_name}</div>
                    <div style={{ fontSize: '13px', color: '#4D6B8A', marginBottom: '2px' }}>{AUDIT_LABELS[entry.event] ?? entry.event}</div>
                    <div style={{ fontSize: '11px', color: '#8BAAC4' }}>{new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                    {entry.note && (
                      <div style={{ marginTop: '6px', background: '#F4F8FF', borderRadius: '6px', padding: '8px 10px', borderLeft: '2px solid #D4E4F4', fontSize: '12.5px', color: '#4D6B8A', fontStyle: 'italic' }}>
                        {entry.note}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
