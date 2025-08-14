import { NextRequest, NextResponse } from 'next/server'
import { createApiSupabase, requireTenantMembership, createAuditLog } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLeadSchema } from '@/lib/validations'
import { z } from 'zod'

const querySchema = z.object({
  status: z.string().optional(),
  productType: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  search: z.string().optional(),
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { tenant: string } }
) {
  try {
    const supabase = createApiSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await requireTenantMembership(params.tenant, user.id)
    const { searchParams } = new URL(request.url)
    
    const query = querySchema.parse({
      status: searchParams.get('status'),
      productType: searchParams.get('productType'),
      priority: searchParams.get('priority'),
      search: searchParams.get('search'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    })

    // Build where clause
    const where: any = {
      tenantId: membership.tenant.id
    }

    if (query.status) {
      where.status = { slug: query.status }
    }

    if (query.productType) {
      where.productType = { slug: query.productType }
    }

    if (query.priority) {
      where.priority = query.priority
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { postcode: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    const page = query.page || 1
    const limit = query.limit || 20
    const skip = (page - 1) * limit

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          createdBy: { select: { name: true, email: true } },
          assignedUser: { select: { name: true, email: true } },
          productType: { select: { name: true, slug: true } },
          status: { select: { name: true, slug: true, color: true } },
          _count: { 
            select: { 
              appointments: true, 
              messages: true 
            } 
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.lead.count({ where })
    ])

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('GET /api/[tenant]/leads error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('Forbidden') ? 403 : 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tenant: string } }
) {
  try {
    const supabase = createApiSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await requireTenantMembership(params.tenant, user.id)
    const body = await request.json()
    const validatedData = createLeadSchema.parse(body)

    // Get default status if not provided
    let statusId = body.statusId
    if (!statusId) {
      const defaultStatus = await prisma.leadStatus.findFirst({
        where: { 
          tenantId: membership.tenant.id,
          isDefault: true 
        }
      })
      statusId = defaultStatus?.id
    }

    if (!statusId) {
      return NextResponse.json(
        { error: 'No default status found. Please set up lead statuses first.' },
        { status: 400 }
      )
    }

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

    const lead = await prisma.lead.create({
      data: {
        ...validatedData,
        tenantId: membership.tenant.id,
        createdById: user.id,
        statusId,
        customFieldValues: JSON.stringify(validatedData.customFieldValues)
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        assignedUser: { select: { name: true, email: true } },
        productType: { select: { name: true, slug: true } },
        status: { select: { name: true, slug: true, color: true } }
      }
    })

    // Create audit log
    await createAuditLog({
      tenantId: membership.tenant.id,
      leadId: lead.id,
      userId: user.id,
      action: 'LEAD_CREATED',
      meta: {
        source: validatedData.source,
        productType: validatedData.productTypeId
      }
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/[tenant]/leads error:', error)
    
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
