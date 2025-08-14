export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// --- Validation schema (aligns with your Lead fields) ---
const LeadCreateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  postcode: z.string().optional(),

  productTypeId: z.string().optional(),
  jobValue: z.number().optional(),
  estimatedValue: z.number().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  source: z.string().optional(),
  notes: z.string().optional(),

  statusId: z.string(),
  customFieldValues: z.any().optional(),
  assignedUserId: z.string().optional()
});

const asJson = (v: unknown): Prisma.InputJsonValue => {
  if (v === undefined) return {};
  return v as Prisma.InputJsonValue;
};

// Helper: find creator user id from header or tenant admin (demo-friendly)
async function resolveCreatorUserId(req: Request, tenantId: string): Promise<string | null> {
  const headerUserId = req.headers.get('x-user-id');
  if (headerUserId) return headerUserId;

  // Fallback: use any ADMIN in this tenant (useful for initial/demo setups)
  const admin = await prisma.membership.findFirst({
    where: { tenantId, role: 'ADMIN' },
    select: { userId: true }
  });
  return admin?.userId ?? null;
}

// POST /api/[tenant]/leads  -> create a lead
export async function POST(req: Request, { params }: { params: { tenant: string } }) {
  try {
    const payload = await req.json();
    const parsed = LeadCreateSchema.parse(payload);

    // 1) Resolve tenant by slug param
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenant },
      select: { id: true }
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // 2) Resolve creator user id (replace this with your real auth later)
    const createdById = await resolveCreatorUserId(req, tenant.id);
    if (!createdById) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // 3) Build unchecked payload (raw FK ids)
    const data: Prisma.LeadUncheckedCreateInput = {
      tenantId: tenant.id,
      createdById,
      statusId: parsed.statusId,
      productTypeId: parsed.productTypeId ?? null,
      assignedUserId: parsed.assignedUserId ?? null,

      name: parsed.name ?? '',
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      address: parsed.address ?? null,
      postcode: parsed.postcode ?? null,
      jobValue: parsed.jobValue ?? null,
      estimatedValue: parsed.estimatedValue ?? null,
      priority: parsed.priority ?? 'MEDIUM',
      source: parsed.source ?? null,
      notes: parsed.notes ?? null,

      customFieldValues: asJson(parsed.customFieldValues ?? {})
    };

    const lead = await prisma.lead.create({ data });
    return NextResponse.json(lead, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid payload', issues: err.issues }, { status: 400 });
    }
    console.error('Create lead error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/* (Optional) GET list — keep only if you want it.
export async function GET(_req: Request, { params }: { params: { tenant: string } }) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenant },
      select: { id: true }
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const leads = await prisma.lead.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(leads);
  } catch (err) {
    console.error('List leads error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
*/
