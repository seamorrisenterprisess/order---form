import { AppShell } from '@/components/AppShell'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/supabase'
import { NewUserForm } from './NewUserForm'
import { UserRow } from './UserRow'
import type { User } from '@/types'

export default async function AdminUsersPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/dashboard')

  const { data: users } = await db
    .from('users')
    .select('id, name, email, role, avatar_initials, is_active, created_at')
    .order('created_at', { ascending: true })

  const allUsers = (users ?? []) as (User & { created_at: string })[]

  const roleLabel: Record<string, string> = {
    operations_analyst: 'Operations Analyst',
    account_manager: 'Account Manager',
    admin: 'Administrator',
  }

  return (
    <AppShell title="User Management" actions={null}>
      <div className="dot-grid" style={{ padding: '28px', minHeight: '100%' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          {/* Page header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: '#0B1829', marginBottom: '4px' }}>
              User Management
            </div>
            <div style={{ fontSize: '13.5px', color: '#4D6B8A' }}>
              {allUsers.length} user{allUsers.length !== 1 ? 's' : ''} in the system
            </div>
          </div>

          {/* Users table */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: '28px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4E4F4', fontWeight: 600, fontSize: '14px', color: '#0F2137' }}>
              All Users
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F4F8FF' }}>
                  {['Name', 'Email', 'Role', 'Joined', 'Status', ''].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: '11px', fontWeight: 700, color: '#4D6B8A',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      borderBottom: '1px solid #D4E4F4',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u, idx) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    roleLabel={roleLabel[u.role] ?? u.role}
                    isLast={idx === allUsers.length - 1}
                    currentUserId={user.id}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* New user form */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4E4F4', fontWeight: 600, fontSize: '14px', color: '#0F2137' }}>
              Create New User
            </div>
            <div style={{ padding: '24px' }}>
              <NewUserForm />
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
