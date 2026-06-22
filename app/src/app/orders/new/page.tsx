import { listSubcontractors, listTemplates } from '@/lib/orders'
import NewOrderForm from './NewOrderForm'
import { db } from '@/lib/supabase'
import type { OrderTemplate } from '@/types'

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const { template: templateId } = await searchParams
  const [subcontractors, templates] = await Promise.all([
    listSubcontractors(),
    listTemplates(),
  ])

  let defaultValues: Partial<OrderTemplate> | undefined
  if (templateId) {
    const { data } = await db
      .from('order_templates')
      .select('*')
      .eq('id', templateId)
      .single()
    if (data) defaultValues = data as OrderTemplate
  }

  return (
    <NewOrderForm
      subcontractors={subcontractors}
      templates={templates}
      defaultValues={defaultValues}
    />
  )
}
