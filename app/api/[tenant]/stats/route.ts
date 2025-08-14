export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { createApiSupabase, requireTenantMembership } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { subDays, startOfDay, endOfDay } from 'date-fns'

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
    
    // Get date range from query params (default to last 30 days)
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = startOfDay(subDays(new Date(), days))
    const endDate = endOfDay(new Date())

    // Base where clause for all queries
    const baseWhere = {
      tenantId: membership.tenant.id,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }

    // Get lead counts by status
    const leadsByStatus = await prisma.leadStatus.findMany({
      where: { tenantId: membership.tenant.id },
      include: {
        _count: {
          select: {
            leads: {
              where: baseWhere
            }
          }
        }
      },
      orderBy: { order: 'asc' }
    })

    // Get all leads for calculations
    const allLeads = await prisma.lead.findMany({
      where: {
        tenantId: membership.tenant.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        status: true
      }
    })

    // Calculate pipeline value (exclude lost leads)
    const pipelineValue = allLeads
      .filter((lead: any) => !lead.status.isFinal || lead.status.slug === 'won')
      .reduce((sum: number, lead: any) => sum + (lead.estimatedValue || lead.jobValue || 0), 0)

    // Calculate won value
    const wonValue = allLeads
      .filter((lead: any) => lead.status.slug === 'won')
      .reduce((sum: number, lead: any) => sum + (lead.estimatedValue || lead.jobValue || 0), 0)

    // Calculate conversion rate
    const totalLeads = allLeads.length
    const wonLeads = allLeads.filter((lead: any) => lead.status.slug === 'won').length
    const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0

    // Calculate average deal size
    const leadsWithValue = allLeads.filter((lead: any) => lead.estimatedValue || lead.jobValue)
    const averageDealSize = leadsWithValue.length > 0 
      ? leadsWithValue.reduce((sum: number, lead: any) => sum + (lead.estimatedValue || lead.jobValue || 0), 0) / leadsWithValue.length
      : 0

    // Get upcoming appointments
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        lead: { tenantId: membership.tenant.id },
        startsAt: {
          gte: new Date(),
          lte: endOfDay(subDays(new Date(), -7)) // Next 7 days
        }
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        }
      },
      orderBy: { startsAt: 'asc' },
      take: 10
    })

    // Get recent activity
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        tenantId: membership.tenant.id,
        createdAt: {
          gte: subDays(new Date(), 7) // Last 7 days
        }
      },
      include: {
        user: { select: { name: true } },
        lead: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // Get leads by source
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: baseWhere,
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    })

    // Get daily lead creation trend
    const dailyLeads = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM leads 
      WHERE tenant_id = ${membership.tenant.id}
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    ` as Array<{ date: string; count: bigint }>

    const stats = {
      summary: {
        totalLeads,
        pipelineValue,
        wonValue,
        conversionRate: Math.round(conversionRate * 100) / 100,
        averageDealSize: Math.round(averageDealSize * 100) / 100
      },
      leadsByStatus: leadsByStatus.map((status: any) => ({
        id: status.id,
        name: status.name,
        slug: status.slug,
        color: status.color,
        count: status._count.leads,
        isFinal: status.isFinal
      })),
      leadsBySource: leadsBySource.map((item: any) => ({
        source: item.source || 'Unknown',
        count: item._count.id
      })),
      upcomingAppointments: upcomingAppointments.map((appointment: any) => ({
        id: appointment.id,
        type: appointment.type,
        title: appointment.title,
        startsAt: appointment.startsAt,
        lead: appointment.lead
      })),
      recentActivity: recentActivity.map((log: any) => ({
        id: log.id,
        action: log.action,
        createdAt: log.createdAt,
        user: log.user?.name || 'System',
        lead: log.lead?.name,
        meta: log.meta
      })),
      dailyTrend: dailyLeads.map((item: any) => ({
        date: item.date,
        count: Number(item.count)
      }))
    }

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('GET /api/[tenant]/stats error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('Forbidden') ? 403 : 500 }
    )
  }
}
