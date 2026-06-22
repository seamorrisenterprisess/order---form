import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { db } from './supabase'
import type { User, UserRole } from '@/types'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
)
const COOKIE_NAME = 'sm_session'
const TOKEN_TTL = '7d'

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.sub as string
  } catch {
    return null
  }
}

export async function getSessionUser(req?: NextRequest): Promise<User | null> {
  let token: string | undefined

  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value
  } else {
    const jar = await cookies()
    token = jar.get(COOKIE_NAME)?.value
  }

  if (!token) return null

  const userId = await verifyToken(token)
  if (!userId) return null

  const { data } = await db
    .from('users')
    .select('id, email, name, role, avatar_initials, is_active, created_at')
    .eq('id', userId)
    .eq('is_active', true)
    .single()

  return data ?? null
}

export function setSessionCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  }
}

export function clearSessionCookie() {
  return { name: COOKIE_NAME, value: '', maxAge: 0, path: '/' }
}

// Role permission helpers
export function canCreateOrders(role: UserRole) {
  return role === 'operations_analyst' || role === 'admin'
}

export function canReviewOrders(role: UserRole) {
  return role === 'account_manager' || role === 'admin'
}

export function canViewAllOrders(role: UserRole) {
  return role === 'account_manager' || role === 'admin'
}

// Allowed status transitions per role
export const ALLOWED_TRANSITIONS: Record<UserRole, Partial<Record<string, string[]>>> = {
  operations_analyst: {
    draft: ['submitted'],
    needs_changes: ['submitted'],
  },
  account_manager: {
    submitted: ['approved_internally', 'needs_changes', 'client_declined'],
    needs_changes: ['approved_internally', 'client_declined'],
    approved_internally: ['sent_to_client'],
    sent_to_client: ['sent_to_client'], // resend
  },
  admin: {
    draft: ['submitted', 'needs_changes', 'approved_internally', 'sent_to_client', 'client_approved', 'client_declined'],
    submitted: ['approved_internally', 'needs_changes', 'client_declined'],
    needs_changes: ['submitted', 'approved_internally', 'client_declined'],
    approved_internally: ['sent_to_client', 'needs_changes'],
    sent_to_client: ['client_approved', 'client_declined'],
    client_approved: [],
    client_declined: [],
  },
}
