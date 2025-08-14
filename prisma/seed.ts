import { Prisma, PrismaClient, CustomFieldType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create a demo tenant
  const demoTenant = await prisma.tenant.create({
    data: {
      name: 'Demo Tenant',
      slug: 'demo-tenant',
    },
  })

  // Create a demo user
  const demoUser = await prisma.user.create({
    data: {
      name: 'Demo User',
      email: 'demo@example.com',
    },
  })

  // Custom fields definition
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
    await prisma.customField.create({
      data: {
        tenantId: demoTenant.id,
        name: field.name,
        slug: field.slug,
        type: field.type,
        isRequired: field.isRequired ?? false,
        isActive: true,
        order: field.order ?? 0,
        options: field.options ? (field.options as Prisma.InputJsonValue) : null,
      },
    })
  }

  // Demo leads
  const demoLeads = [
    {
      customFieldValues: '{}',
      name: 'John Smith',
      email: 'john@example.com',
      phone: '07123456789',
      address: '123 Demo Street',
      postcode: 'AB12 3CD',
      productTypeId: null,
      estimatedValue: 1200,
      priority: 'MEDIUM',
      source: 'Google',
      statusId: null,
    },
  ]

  for (const leadData of demoLeads) {
    await prisma.lead.create({
      data: {
        ...leadData,
        tenantId: demoTenant.id,
        createdById: demoUser.id,
      } as Prisma.LeadUncheckedCreateInput,
    })
  }
}

main()
  .then(() => {
    console.log('Database seeded successfully.')
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
