import { listSubcontractors } from '@/lib/orders'
import NewOrderForm from './NewOrderForm'

export default async function NewOrderPage() {
  const subcontractors = await listSubcontractors()
  return <NewOrderForm subcontractors={subcontractors} />
}
