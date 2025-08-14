import { NextRequest, NextResponse } from 'next/server'
import { createApiSupabase, requireTenantMembership, createAuditLog } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateLeadSchema, updateLeadStatusSchema } from '@/lib/validations'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: { tenant: string; id: string } }
) {
  try {
    const supabase = createApiSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await requireTenantMembership(params.tenant, user.id)

    const lead = await prisma.lead.findFirst({
      where: {
        id: params.id,
        tenantId: membership.tenant.id
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        assignedUser: { select: { name: true, email: true } },
        productType: { select: { name: true, slug: true } },
        status: { select: { name: true, slug: true, color: true } },
        appointments: {
          orderBy: { startsAt: 'asc' },
          take: 10
        },
        messages: {
          include: {
            user: { select: { name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        auditLogs: {
          include: {
            user: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Parse custom field values
    const leadWithParsedFields = {
      ...lead,
      customFieldValues: typeof lead.customFieldValues === 'string' 
        ? JSON.parse(lead.customFieldValues) 
        : lead.customFieldValues
    }

    return NextResponse.json(leadWithParsedFields)
  } catch (error: any) {
    console.error('GET /api/[tenant]/leads/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('Forbidden') ? 403 : 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { tenant: string; id: string } }
) {
  try {
    const supabase = createApiSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await requireTenantMembership(params.tenant, user.id)
    const body = await request.json()
    
    // Check if this is a status update
    if (body.statusId) {
      const statusData = updateLeadStatusSchema.parse(body)
      
      // Verify status belongs to tenant
      const status = await prisma.leadStatus.findFirst({
        where: {
          id: statusData.statusId,
          tenantId: membership.tenant.id
        }
      })
      
      if (!status) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        )
      }

      const lead = await prisma.lead.findFirst({
        where: {
          id: params.id,
          tenantId: membership.tenant.id
        },
        include: { status: true }
      })

      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }

      const updatedLead = await prisma.lead.update({
        where: { id: params.id },
        data: { statusId: statusData.statusId },
        include: {
          createdBy: { select: { name: true, email: true } },
          assignedUser: { select: { name: true, email: true } },
          productType: { select: { name: true, slug: true } },
          status: { select: { name: true, slug: true, color: true } }
        }
      })

      // Create audit log for status change
      await createAuditLog({
        tenantId: membership.tenant.id,
        leadId: lead.id,
        userId: user.id,
        action: 'STATUS_CHANGED',
        meta: {
          oldStatus: lead.status.name,
          newStatus: status.name
        }
      })

      return NextResponse.json(updatedLead)
    } else {
      // Regular lead update
      const validatedData = updateLeadSchema.parse(body)

      // Validate product type if provided
      if (validatedData.productTypeId) {
        const productType = await prisma.productType.findFirst({
          where: {
            id: validatedData.productTypeId,
            tenantId: membership.tenant.id
          }
        })
        
        if (!productType) {
          return NextResponse.json(
            { error: 'Invalid product type' },
            { status: 400 }
          )
        }
      }

      const lead = await prisma.lead.findFirst({
        where: {
          id: params.id,
          tenantId: membership.tenant.id
        }
      })

      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }

      const updatedLead = await prisma.lead.update({
        where: { id: params.id },
        data: {
          ...validatedData,
          customFieldValues: validatedData.customFieldValues 
            ? JSON.stringify(validatedData.customFieldValues)
            : undefined
        },
        include: {
          createdBy: { select: { name: true, email: true } },
          assignedUser: { select: { name: true, email: true } },
          productType: { select: { name: true, slug: true } },
          status: { select: { name: true, slug: true, color: true } }
        }
      })

      // Create audit log for lead update
      await createAuditLog({
        tenantId: membership.tenant.id,
        leadId: lead.id,
        userId: user.id,
        action: 'LEAD_UPDATED',
        meta: {
          updatedFields: Object.keys(validatedData)
        }
      })

      return NextResponse.json(updatedLead)
    }
  } catch (error: any) {
    console.error('PATCH /api/[tenant]/leads/[id] error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('Forbidden') ? 403 : 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenant: string; id: string } }
) {
  try {
    const supabase = createApiSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await requireTenantMembership(params.tenant, user.id, 'MANAGER')

    const lead = await prisma.lead.findFirst({
      where: {
        id: params.id,
        tenantId: membership.tenant.id
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    await prisma.lead.delete({
      where: { id: params.id }
    })

    // Create audit log for lead deletion
    await createAuditLog({
      tenantId: membership.tenant.id,
      leadId: lead.id,
      userId: user.id,
      action: 'LEAD_DELETED',
      meta: {
        leadName: lead.name
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/[tenant]/leads/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('Forbidden') ? 403 : 500 }
    )
  }
}
