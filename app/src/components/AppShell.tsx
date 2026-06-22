import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from './Sidebar'

export async function AppShell({ children, title, actions }: {
  children: React.ReactNode
  title: string
  actions?: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar user={user} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{
          background: 'white', borderBottom: '1px solid #D4E4F4',
          padding: '0 28px', height: '56px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#0B1829' }}>{title}</div>
          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{actions}</div>}
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
