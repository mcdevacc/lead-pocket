import {
  Prisma,
  PrismaClient,
  CustomFieldType,
  MessageChannel,
  Priority,
  Role,
} from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1) Tenant (includes required `industry`)
  const demoTenant = await prisma.tenant.create({
    data: {
      name: 'Premier Blinds & Shutters',
      slug: 'premier-blinds',
      industry: 'home-improvement',
      timezone: 'Europe/London',
      settings: {
        create: {
          businessName: 'Premier Blinds & Shutters Ltd',
          businessAddress: '123 High Street, London, SW1A 1AA',
          businessPhone: '+44 20 7123 4567',
          businessEmail: 'info@premierblinds.co.uk',
          website: 'https://premierblinds.co.uk',
          workingHoursStart: '09:00',
          workingHoursEnd: '17:30',
          workingDays: JSON.parse('[1,2,3,4,5]'),
          autoAssignLeads: false,
          leadSlaHours: 24,
          primaryColor: '#2563eb',
        },
      },
    },
  })

  // 2) User + Membership
  const demoUser = await prisma.user.create({
    data: {
      email: 'admin@premierblinds.co.uk',
      name: 'Sarah Johnson',
      emailVerified: new Date(),
    },
  })

  await prisma.membership.create({
    data: {
      tenantId: demoTenant.id,
      userId: demoUser.id,
      role: Role.ADMIN,
    },
  })

  // 3) Lead Statuses
  const leadStatuses = [
    { name: 'New Lead', slug: 'new', color: '#6b7280', order: 1, isDefault: true },
    { name: 'Contacted', slug: 'contacted', color: '#3b82f6', order: 2 },
    { name: 'Qualified', slug: 'qualified', color: '#8b5cf6', order: 3 },
    { name: 'Quote Requested', slug: 'quote_requested', color: '#f59e0b', order: 4 },
    { name: 'Quote Sent', slug: 'quote_sent', color: '#f97316', order: 5 },
    { name: 'Follow Up', slug: 'follow_up', color: '#84cc16', order: 6 },
    { name: 'Won', slug: 'won', color: '#10b981', order: 7, isFinal: true },
    { name: 'Lost', slug: 'lost', color: '#ef4444', order: 8, isFinal: true },
  ] as const

  for (const status of leadStatuses) {
    await prisma.leadStatus.create({
      data: {
        tenantId: demoTenant.id,
        name: status.name,
        slug: status.slug,
        color: status.color,
        order: status.order,
        isDefault: (status as any).isDefault ?? false,
        isFinal: (status as any).isFinal ?? false,
      },
    })
  }

  // 4) Product Types (no .entries())
  const productTypes = [
    { name: 'Venetian Blinds', slug: 'venetian-blinds', description: 'Classic horizontal slat blinds' },
    { name: 'Roller Blinds', slug: 'roller-blinds', description: 'Simple up and down rolling blinds' },
    { name: 'Vertical Blinds', slug: 'vertical-blinds', description: 'Vertical slat blinds for large windows' },
    { name: 'Plantation Shutters', slug: 'plantation-shutters', description: 'Wooden interior shutters' },
    { name: 'Cafe Style Shutters', slug: 'cafe-shutters', description: 'Half-height window shutters' },
    { name: 'Motorised Blinds', slug: 'motorised-blinds', description: 'Electric remote-controlled blinds' },
  ]

  for (let i = 0; i < productTypes.length; i++) {
    const pt = productTypes[i]
    await prisma.productType.create({
      data: {
        tenantId: demoTenant.id,
        name: pt.name,
        slug: pt.slug,
        description: pt.description,
        order: i + 1,
      },
    })
  }

  // 5) Custom Fields (explicit typing; pass real JSON)
  const customFields: Array<{
    name: string
    slug: string
    type: CustomFieldType
    options?: string[]
    isRequired?: boolean
    order: number
  }> = [
    {
      name: 'Property Type',
      slug: 'property_type',
      type: 'SELECT',
      options: ['House', 'Flat', 'Bungalow', 'Commercial'],
      isRequired: false,
      order: 1,
    },
    {
      name: 'Number of Windows',
      slug: 'window_count',
      type: 'NUMBER',
      isRequired: false,
      order: 2,
    },
    {
      name: 'Installation Urgency',
      slug: 'urgency',
      type: 'SELECT',
      options: ['ASAP', 'Within 2 weeks', 'Within a month', 'No rush'],
      isRequired: false,
      order: 3,
    },
    {
      name: 'Budget Range',
      slug: 'budget_range',
      type: 'SELECT',
      options: ['Under £500', '£500-£1000', '£1000-£2000', '£2000+'],
      isRequired: false,
      order: 4,
    },
    {
      name: 'Heard About Us',
      slug: 'referral_source',
      type: 'SELECT',
      options: ['Google Search', 'Facebook', 'Recommendation', 'Local Ad', 'Previous Customer'],
      isRequired: false,
      order: 5,
    },
  ]

  for (const field of customFields) {
    const data: Prisma.CustomFieldUncheckedCreateInput = {
      tenantId: demoTenant.id,
      name: field.name,
      slug: field.slug,
      type: field.type,
      isRequired: field.isRequired ?? false,
      isActive: true,
      order: field.order ?? 0,
      options: (field.options as Prisma.InputJsonValue) ?? null,
    }
    await prisma.customField.create({ data })
  }

  // 6) Message Templates (typed enum)
  const templates: Array<{
    name: string
    channel: MessageChannel
    subject?: string
    body: string
  }> = [
    {
      name: 'Initial Contact SMS',
      channel: 'SMS',
      body:
        "Hi {{lead.name}}, thanks for your interest in {{tenant.businessName}}. We'll be in touch within 24 hours to discuss your {{lead.productType}} requirements.",
    },
    {
      name: 'Quote Follow Up',
      channel: 'EMAIL',
      subject: 'Your Quote from {{tenant.businessName}}',
      body:
        "Dear {{lead.name}},\n\nThank you for choosing {{tenant.businessName}}. Please find attached your personalised quote.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\n{{user.name}}\n{{tenant.businessPhone}}",
    },
    {
      name: 'Appointment Reminder',
      channel: 'SMS',
      body:
        'Hi {{lead.name}}, this is a reminder of your appointment with {{tenant.businessName}} tomorrow at {{appointment.time}}. Please reply if you need to reschedule.',
    },
    {
      name: 'Thank You Message',
      channel: 'EMAIL',
      subject: 'Thank you for choosing {{tenant.businessName}}',
      body:
        "Dear {{lead.name}},\n\nThank you for choosing {{tenant.businessName}} for your window treatments. We appreciate your business and hope you love your new {{lead.productType}}.\n\nPlease don't hesitate to contact us if you need anything else.\n\nBest regards,\nThe {{tenant.businessName}} Team",
    },
  ]

  for (const t of templates) {
    await prisma.template.create({
      data: {
        tenantId: demoTenant.id,
        name: t.name,
        channel: t.channel,
        subject: t.subject ?? null,
        body: t.body,
        isActive: true,
      },
    })
  }

  // 7) Lookups for demo leads
  const newStatus = await prisma.leadStatus.findFirst({
    where: { tenantId: demoTenant.id, slug: 'new' },
    select: { id: true },
  })
  const contactedStatus = await prisma.leadStatus.findFirst({
    where: { tenantId: demoTenant.id, slug: 'contacted' },
    select: { id: true },
  })
  const venetianBlinds = await prisma.productType.findFirst({
    where: { tenantId: demoTenant.id, slug: 'venetian-blinds' },
    select: { id: true },
  })
  const shutters = await prisma.productType.findFirst({
    where: { tenantId: demoTenant.id, slug: 'plantation-shutters' },
    select: { id: true },
  })

  if (newStatus && contactedStatus && venetianBlinds && shutters) {
    // 8) Demo Leads (unchecked input + real JSON)
    const demoLeads = [
      {
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '+44 7123 456789',
        address: '45 Oak Avenue, London',
        postcode: 'SW12 8QR',
        productTypeId: venetianBlinds.id,
        estimatedValue: 850,
        priority: 'HIGH' as Priority,
        source: 'website',
        statusId: newStatus.id,
        customFieldValues: {
          property_type: 'House',
          window_count: 6,
          urgency: 'Within 2 weeks',
          budget_range: '£500-£1000',
        } as Prisma.InputJsonValue,
      },
      {
        name: 'Emma Wilson',
        email: 'emma.wilson@email.com',
        phone: '+44 7987 654321',
        address: '12 Pine Close, Brighton',
        postcode: 'BN2 4RT',
        productTypeId: shutters.id,
        estimatedValue: 2200,
        priority: 'MEDIUM' as Priority,
        source: 'referral',
        statusId: contactedStatus.id,
        customFieldValues: {
          property_type: 'Flat',
          window_count: 3,
          urgency: 'Within a month',
          budget_range: '£2000+',
        } as Prisma.InputJsonValue,
      },
      {
        name: 'Michael Brown',
        email: 'mike.brown@email.com',
        phone: '+44 7555 123456',
        address: '78 Elm Street, Manchester',
        postcode: 'M15 6PA',
        productTypeId: venetianBlinds.id,
        estimatedValue: 450,
        priority: 'LOW' as Priority,
        source: 'google',
        statusId: newStatus.id,
        customFieldValues: {
          property_type: 'Bungalow',
          window_count: 4,
          urgency: 'No rush',
          budget_range: 'Under £500',
        } as Prisma.InputJsonValue,
      },
    ]

    for (const ld of demoLeads) {
      const data: Prisma.LeadUncheckedCreateInput = {
        tenantId: demoTenant.id,
        createdById: demoUser.id,
        statusId: ld.statusId,
        productTypeId: ld.productTypeId ?? null,
        assignedUserId: null,

        name: ld.name,
        email: ld.email ?? null,
        phone: ld.phone ?? null,
        address: ld.address ?? null,
        postcode: ld.postcode ?? null,
        jobValue: null,
        estimatedValue: ld.estimatedValue ?? null,
        priority: (ld.priority as Priority) ?? 'MEDIUM',
        source: ld.source ?? null,
        notes: null,

        customFieldValues: ld.customFieldValues,
      }

      const lead = await prisma.lead.create({ data })

      await prisma.auditLog.create({
        data: {
          tenantId: demoTenant.id,
          leadId: lead.id,
          userId: demoUser.id,
          action: 'LEAD_CREATED',
          meta: JSON.stringify({ source: ld.source }),
        },
      })
    }
  }

  console.log('Database seeded successfully!')
  console.log(`Demo tenant: ${demoTenant.slug}`)
  console.log(`Demo user: ${demoUser.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
