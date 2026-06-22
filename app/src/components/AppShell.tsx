import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { NotificationBell } from './NotificationBell'
import { getUnreadCount } from '@/lib/notifications'

export async function AppShell({ children, title, actions }: {
  children: React.ReactNode
  title: string
  actions?: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const unreadCount = await getUnreadCount(user.id)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <div className="desktop-sidebar">
        <Sidebar user={user} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <div style={{
          background: 'white', borderBottom: '1px solid #D4E4F4',
          padding: '0 28px', height: '56px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          gap: '12px',
        }}>
          {/* Hamburger (mobile only) + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <MobileNav user={user} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#0B1829', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{actions}</div>}
            <NotificationBell initialCount={unreadCount} userId={user.id} />
          </div>
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
