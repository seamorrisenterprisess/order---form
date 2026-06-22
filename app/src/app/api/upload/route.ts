import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db, PHOTOS_BUCKET } from '@/lib/supabase'

// POST /api/upload
// Accepts: multipart/form-data { file, orderId, caption, sortOrder }
// Returns: { storage_key, public_url }
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const orderId = formData.get('orderId') as string | null
  const caption = (formData.get('caption') as string) ?? ''
  const sortOrder = parseInt((formData.get('sortOrder') as string) ?? '0', 10)

  if (!file || !orderId) {
    return NextResponse.json({ error: 'file and orderId are required' }, { status: 400 })
  }

  // Verify order exists and user has access
  const { data: order } = await db
    .from('orders')
    .select('id, submitted_by_id')
    .eq('id', orderId)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (user.role === 'operations_analyst' && order.submitted_by_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const key = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await db.storage
    .from(PHOTOS_BUCKET)
    .upload(key, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: photoRecord, error: dbError } = await db
    .from('order_photos')
    .insert({
      order_id: orderId,
      storage_key: key,
      caption,
      sort_order: sortOrder,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const publicUrl = db.storage.from(PHOTOS_BUCKET).getPublicUrl(key).data.publicUrl

  return NextResponse.json({ data: { ...photoRecord, public_url: publicUrl } }, { status: 201 })
}
