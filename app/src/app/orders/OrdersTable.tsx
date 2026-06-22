'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/StatusBadge'
import type { Order } from '@/types'

function fmt(n: number) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })
}

function buildCsv(orders: Order[]): string {
  const headers = ['Order ID', 'Job Name', 'Client', 'Status', 'Date Submitted', 'Sub Cost', 'Client Price']
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = orders.map(o => [
    escape(o.id),
    escape(o.job_name),
    escape(o.client_name),
    escape(o.status),
    escape(o.date_submitted ?? ''),
    escape(o.sub_cost ?? ''),
    escape(o.client_price ?? ''),
  ].join(','))
  return [headers.join(','), ...rows].join('\n')
}

interface OrdersTableProps {
  orders: Order[]
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const allSelected = orders.length > 0 && selected.size === orders.length
  const someSelected = selected.size > 0

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(orders.map(o => o.id)))
    }
  }, [allSelected, orders])

  const toggleOne = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  function handleExportCsv() {
    const selectedOrders = orders.filter(o => selected.has(o.id))
    const csv = buildCsv(selectedOrders)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="table-scroll-wrap" style={{ overflowX: 'auto', marginTop: '0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #D4E4F4', background: '#F4F8FF', whiteSpace: 'nowrap', width: '40px' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                  onChange={toggleAll}
                  style={{ cursor: 'pointer', accentColor: '#1355C2', width: '15px', height: '15px' }}
                  aria-label="Select all orders"
                />
              </th>
              {['Order ID', 'Job Name', 'Client', 'Subcontractor', 'Submitted By', 'Status', 'Date', 'Sub Cost', 'Client Price'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #D4E4F4', background: '#F4F8FF', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#8BAAC4' }}>No orders match your filters.</td></tr>
            ) : orders.map(o => (
              <tr
                key={o.id}
                style={{ borderBottom: '1px solid #F0F4F8', cursor: 'pointer', background: selected.has(o.id) ? '#EEF5FD' : 'transparent' }}
                onMouseEnter={e => { if (!selected.has(o.id)) (e.currentTarget as HTMLElement).style.background = '#E8F2FD' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected.has(o.id) ? '#EEF5FD' : 'transparent' }}
              >
                <td style={{ padding: '12px 14px' }} onClick={e => { e.stopPropagation() }}>
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggleOne(o.id)}
                    style={{ cursor: 'pointer', accentColor: '#1355C2', width: '15px', height: '15px' }}
                    aria-label={`Select order ${o.id}`}
                  />
                </td>
                <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: '13px', color: '#1355C2' }}>
                  <Link href={`/orders/${o.id}`} style={{ color: '#1355C2', textDecoration: 'none' }}>{o.id}</Link>
                </td>
                <td style={{ padding: '12px 14px', fontWeight: 500 }}>
                  <Link href={`/orders/${o.id}`} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>{o.job_name}</Link>
                </td>
                <td style={{ padding: '12px 14px' }}>{o.client_name}</td>
                <td style={{ padding: '12px 14px' }}>{o.subcontractor_name || '—'}</td>
                <td style={{ padding: '12px 14px', color: '#4D6B8A' }}>{(o.submitted_by as any)?.name ?? '—'}</td>
                <td style={{ padding: '12px 14px' }}><StatusBadge status={o.status} /></td>
                <td style={{ padding: '12px 14px', color: '#4D6B8A', fontSize: '13px' }}>{o.date_submitted ?? '—'}</td>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>{o.sub_cost ? fmt(o.sub_cost) : '—'}</td>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1355C2' }}>{o.client_price ? fmt(o.client_price) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating bulk action bar */}
      {someSelected && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0B1829',
          color: 'white',
          borderRadius: '10px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 8px 32px rgba(11,24,41,0.35)',
          zIndex: 100,
          fontSize: '13.5px',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}>
          <span style={{ color: '#8BAAC4' }}>{selected.size} selected</span>
          <span style={{ color: '#2990FF', cursor: 'default' }}>—</span>
          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              background: '#1355C2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            style={{
              background: 'transparent',
              color: '#8BAAC4',
              border: '1px solid #2A3E56',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      )}
    </>
  )
}
