'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@/types'

function NavItem({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 20px', textDecoration: 'none',
      color: active ? 'white' : 'rgba(255,255,255,0.55)',
      background: active ? 'rgba(19,85,194,0.25)' : 'transparent',
      borderLeft: active ? '3px solid #2990FF' : '3px solid transparent',
      fontSize: '13.5px', fontWeight: 500,
      transition: 'all 0.15s',
    }}
    onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' } }}
    onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
    >
      <span style={{ fontSize: '16px', width: '20px', textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      {label}
    </Link>
  )
}

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()

  const isAnalyst = user.role === 'operations_analyst'
  const isAM = user.role === 'account_manager'
  const isAdmin = user.role === 'admin'

  const roleLabel = {
    operations_analyst: 'Operations Analyst',
    account_manager: 'Account Manager',
    admin: 'Administrator',
  }[user.role]

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{
      width: '240px', background: '#0B1829', flexShrink: 0,
      display: 'flex', flexDirection: 'column', height: '100vh',
      position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', background: '#1355C2', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: '15px', color: 'white', flexShrink: 0,
          }}>SM</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'white' }}>Sea Morris</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>Scope Orders</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        <NavItem href="/dashboard" icon="▦" label="Dashboard" active={pathname === '/dashboard'} />
        {(isAnalyst || isAdmin) && (
          <NavItem href="/orders/new" icon="＋" label="New Scope Order" active={pathname === '/orders/new'} />
        )}
        <NavItem href="/orders" icon="≡" label="All Orders" active={pathname.startsWith('/orders') && !pathname.includes('new')} />
      </nav>

      {/* User footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%', background: '#1355C2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 600, color: 'white', flexShrink: 0,
          }}>{user.avatar_initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{roleLabel}</div>
          </div>
          <button onClick={handleLogout} title="Sign out" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.35)', fontSize: '14px', padding: '4px', borderRadius: '4px',
          }}>↩</button>
        </div>
      </div>
    </div>
  )
}
