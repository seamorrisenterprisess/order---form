import { db } from './supabase'

export interface Notification {
  id: string
  user_id: string
  order_id: string | null
  type: string
  title: string
  body: string | null
  read: boolean
  created_at: string
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body?: string,
  orderId?: string
): Promise<void> {
  await db.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    order_id: orderId ?? null,
  })
}

export async function getNotifications(
  userId: string,
  limit = 30
): Promise<Notification[]> {
  const { data } = await db
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('read', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as Notification[]
}

export async function markRead(
  notificationId: string,
  userId: string
): Promise<void> {
  await db
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)

  return count ?? 0
}
