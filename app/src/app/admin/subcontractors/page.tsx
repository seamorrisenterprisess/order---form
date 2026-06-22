import { AppShell } from '@/components/AppShell'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listAllSubcontractors } from '@/lib/orders'
import { NewSubcontractorForm } from './NewSubcontractorForm'
import { SubcontractorRow } from './SubcontractorRow'

export default async function AdminSubcontractorsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/dashboard')

  const subcontractors = await listAllSubcontractors()

  return (
    <AppShell title="Subcontractor Directory" actions={null}>
      <div className="dot-grid" style={{ padding: '28px', minHeight: '100%' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          {/* New subcontractor form */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: '28px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4E4F4', fontWeight: 600, fontSize: '14px', color: '#0F2137' }}>
              Add New Subcontractor
            </div>
            <div style={{ padding: '20px' }}>
              <NewSubcontractorForm />
            </div>
          </div>

          {/* Directory table */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4E4F4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: '#0F2137' }}>All Subcontractors</span>
              <span style={{ fontSize: '12px', color: '#8BAAC4' }}>{subcontractors.length} total</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: '#F4F8FF' }}>
                    {['Company', 'Contact', 'Phone', 'Email', 'Specialty', 'Status'].map(col => (
                      <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#4D6B8A', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #D4E4F4', whiteSpace: 'nowrap' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subcontractors.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '28px', textAlign: 'center', color: '#8BAAC4', fontSize: '13px' }}>
                        No subcontractors yet.
                      </td>
                    </tr>
                  ) : subcontractors.map((sub, i) => (
                    <SubcontractorRow key={sub.id} sub={sub} isLast={i === subcontractors.length - 1} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
