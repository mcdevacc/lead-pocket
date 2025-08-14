import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { Role } from '@prisma/client'

export function createServerSupabase() {
  return createServerComponentClient({ cookies })
}

export function createApiSupabase() {
  return createRouteHandlerClient({ cookies })
}

export async function getCurrentUser() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function getTenantMembership(tenantSlug: string, userId?: string) {
  if (!userId) {
    const user = await requireAuth()
    userId = user.id
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      tenant: { slug: tenantSlug }
    },
    include: {
      tenant: {
        include: {
          settings: true
        }
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  })

  return membership
}

export async function requireTenantMembership(
  tenantSlug: string, 
  userId?: string,
  minRole?: Role
) {
  const membership = await getTenantMembership(tenantSlug, userId)
  
  if (!membership) {
    throw new Error('Forbidden: No access to tenant')
  }

  if (minRole) {
    const roleHierarchy = { AGENT: 0, MANAGER: 1, ADMIN: 2 }
    if (roleHierarchy[membership.role] < roleHierarchy[minRole]) {
      throw new Error('Forbidden: Insufficient permissions')
    }
  }

  return membership
}

export async function createAuditLog({
  tenantId,
  userId,
  leadId,
  action,
  meta
}: {
  tenantId: string
  userId?: string
  leadId?: string
  action: string
  meta?: any
}) {
  return prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      leadId,
      action,
      meta: meta ? JSON.stringify(meta) : null
    }
  })
}
