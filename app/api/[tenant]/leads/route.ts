export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// --- Validation schema (align with your UI payload) ---
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

  // IDs coming from your UI / server context
  statusId: z.string(),

  // JSON — allow any serialisable structure
  customFieldValues: z.any().optional(),

  // Optional assignment
  assignedUserId: z.string().optional()
});

// Helper: coerce unknown -> Prisma.InputJsonValue
const asJson = (v: unknown): Prisma.InputJsonValue => {
  if (v === undefined) return {};
  // Trusting zod input; ensure serialisable
  return v as Prisma.InputJsonValue;
};

// If you already have your own auth/membership fetching, keep using it.
// Stubs below to show shape — replace with your real logic.
async function getCurrentUser(req: Request) {
  // e.g., read session/cookies and fetch user
  // must return { id: string }
  throw new Error('Implement getCurrentUser()');
}

async function getMembershipForTenant(userId: string, tenantSlugOrId: string) {
  // return membership with tenant id
  // e.g., prisma.membership.findFirst({ where: { userId, tenant: { slug: tenantParam } }, include: { tenant: true } })
  throw new Error('Implement getMembershipForTenant()');
}

// ---- CREATE LEAD (POST) ----
export async function POST(req: Request, { params }: { params: { tenant: string } }) {
  try {
    const body = await req.json();
    const parsed = LeadCreateSchema.parse(body);

    // Load user + membership/tenant (replace with your existing logic)
    const user = await getCurrentUser(req);
    const membership = await getMembershipForTenant(user.id, params.tenant);
    if (!membership?.tenant?.id) {
      return NextResponse.json({ error: 'Tenant not found or access denied' }, { status: 403 });
    }

    // Build the unchecked data payload explicitly
    const data: Prisma.LeadUncheckedCreateInput = {
      // FK ids (unchecked path)
      tenantId: membership.tenant.id,
      createdById: user.id,
      statusId: parsed.statusId,
      productTypeId: parsed.productTypeId ?? null,
      assignedUserId: parsed.assignedUserId ?? null,

      // Scalars
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

      // JSON: pass actual object (NOT JSON.stringify)
      customFieldValues: asJson(parsed.customFieldValues ?? {})
    };

    const lead = await prisma.lead.create({ data });

    return NextResponse.json(lead, { status: 201 });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid payload', issues: err.issues }, { status: 400 });
    }
    console.error('Create lead error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ---- OPTIONAL: LIST LEADS (GET) ----
// Keep this if your original file had it; otherwise remove.
/*
export async function GET(_req: Request, { params }: { params: { tenant: string } }) {
  try {
    const user = await getCurrentUser(_req);
    const membership = await getMembershipForTenant(user.id, params.tenant);
    if (!membership?.tenant?.id) {
      return NextResponse.json({ error: 'Tenant not found or access denied' }, { status: 403 });
    }

    const leads = await prisma.lead.findMany({
      where: { tenantId: membership.tenant.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(leads);
  } catch (err) {
    console.error('List leads error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
*/
