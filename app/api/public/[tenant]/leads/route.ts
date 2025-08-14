import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { publicLeadSchema } from '@/lib/validations'
import { z } from 'zod'

// CORS headers for embed forms
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_EMBED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tenant: string } }
) {
  try {
    // Check CORS origin
    const origin = request.headers.get('origin')
    const allowedOrigins = process.env.ALLOWED_EMBED_ORIGINS?.split(',') || []
    
    if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      return NextResponse.json(
        { error: 'Origin not allowed' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenant },
      include: {
        leadStatuses: {
          where: { isDefault: true },
          take: 1
        }
      }
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const defaultStatus = tenant.leadStatuses[0]
    if (!defaultStatus) {
      return NextResponse.json(
        { error: 'No default status configured for this tenant' },
        { status: 500, headers: corsHeaders }
      )
    }

    const body = await request.json()
    const validatedData = publicLeadSchema.parse(body)

    // Create system user for public leads if not exists
    let systemUser = await prisma.user.findUnique({
      where: { email: 'system@leadpocket.com' }
    })

    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          email: 'system@leadpocket.com',
          name: 'System',
          emailVerified: new Date()
        }
      })
    }

    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        name: validatedData.name,
        email: validatedData.email || undefined,
        phone: validatedData.phone,
        address: validatedData.address,
        postcode: validatedData.postcode,
        notes: validatedData.message,
        source: validatedData.source || 'website',
        priority: 'MEDIUM',
        tenantId: tenant.id,
        createdById: systemUser.id,
        statusId: defaultStatus.id,
        customFieldValues: JSON.stringify({
          ...validatedData.customFieldValues,
          utm_source: validatedData.utmSource,
          utm_medium: validatedData.utmMedium,
          utm_campaign: validatedData.utmCampaign
        })
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        leadId: lead.id,
        action: 'LEAD_CREATED',
        meta: JSON.stringify({
          source: 'public_form',
          origin: origin,
          utm: {
            source: validatedData.utmSource,
            medium: validatedData.utmMedium,
            campaign: validatedData.utmCampaign
          }
        })
      }
    })

    return NextResponse.json(
      { 
        success: true, 
        leadId: lead.id,
        message: 'Thank you! We\'ll be in touch soon.' 
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('POST /api/public/[tenant]/leads error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tenant: string } }
) {
  try {
    // This endpoint returns form configuration for the embed
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenant },
      include: {
        settings: true,
        productTypes: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        },
        customFields: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const formConfig = {
      tenant: {
        name: tenant.name,
        businessName: tenant.settings?.businessName || tenant.name,
        primaryColor: tenant.settings?.primaryColor || '#3b82f6'
      },
      productTypes: tenant.productTypes.map((pt: any) => ({
        id: pt.id,
        name: pt.name,
        slug: pt.slug
      })),
      customFields: tenant.customFields.map((cf: any) => ({
        id: cf.id,
        name: cf.name,
        slug: cf.slug,
        type: cf.type,
        options: cf.options ? JSON.parse(cf.options as string) : null,
        isRequired: cf.isRequired
      }))
    }

    return NextResponse.json(formConfig, { headers: corsHeaders })
  } catch (error: any) {
    console.error('GET /api/public/[tenant]/leads error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
