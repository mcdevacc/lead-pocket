import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create demo tenant
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
          workingDays: [1, 2, 3, 4, 5],
          autoAssignLeads: false,
          leadSlaHours: 24,
          primaryColor: '#2563eb'
        }
      }
    }
  })

  // Create demo user
  const demoUser = await prisma.user.create({
    data: {
      email: 'admin@premierblinds.co.uk',
      name: 'Sarah Johnson',
      emailVerified: new Date()
    }
  })

  // Create admin membership
  await prisma.membership.create({
    data: {
      tenantId: demoTenant.id,
      userId: demoUser.id,
      role: 'ADMIN'
    }
  })

  // Create lead statuses
  const leadStatuses = [
    { name: 'New Lead', slug: 'new', color: '#6b7280', order: 1, isDefault: true },
    { name: 'Contacted', slug: 'contacted', color: '#3b82f6', order: 2 },
    { name: 'Qualified', slug: 'qualified', color: '#8b5cf6', order: 3 },
    { name: 'Quote Requested', slug: 'quote_requested', color: '#f59e0b', order: 4 },
    { name: 'Quote Sent', slug: 'quote_sent', color: '#f97316', order: 5 },
    { name: 'Follow Up', slug: 'follow_up', color: '#84cc16', order: 6 },
    { name: 'Won', slug: 'won', color: '#10b981', order: 7, isFinal: true },
    { name: 'Lost', slug: 'lost', color: '#ef4444', order: 8, isFinal: true }
  ]

  for (const status of leadStatuses) {
    await prisma.leadStatus.create({
      data: {
        ...status,
        tenantId: demoTenant.id
      }
    })
  }

  // Create product types
  const productTypes = [
    { name: 'Venetian Blinds', slug: 'venetian-blinds', description: 'Classic horizontal slat blinds' },
    { name: 'Roller Blinds', slug: 'roller-blinds', description: 'Simple up and down rolling blinds' },
    { name: 'Vertical Blinds', slug: 'vertical-blinds', description: 'Vertical slat blinds for large windows' },
    { name: 'Plantation Shutters', slug: 'plantation-shutters', description: 'Wooden interior shutters' },
    { name: 'Cafe Style Shutters', slug: 'cafe-shutters', description: 'Half-height window shutters' },
    { name: 'Motorised Blinds', slug: 'motorised-blinds', description: 'Electric remote-controlled blinds' }
  ]

  // UPDATED LOOP: avoid .entries() to keep TS happy on lower targets
  for (let i = 0; i < productTypes.length; i++) {
    const productType = productTypes[i]
    await prisma.productType.create({
      data: {
        ...productType,
        tenantId: demoTenant.id,
        order: i + 1
      }
    })
  }

  // Create custom fields
  const customFields = [
    {
      name: 'Property Type',
      slug: 'property_type',
      type: 'SELECT',
      options: ['House', 'Flat', 'Bungalow', 'Commercial'],
      isRequired: false,
      order: 1
    },
    {
      name: 'Number of Windows',
      slug: 'window_count',
      type: 'NUMBER',
      isRequired: false,
      order: 2
    },
    {
      name: 'Installation Urgency',
      slug: 'urgency',
      type: 'SELECT',
      options: ['ASAP', 'Within 2 weeks', 'Within a month', 'No rush'],
      isRequired: false,
      order: 3
    },
    {
      name: 'Budget Range',
      slug: 'budget_range',
      type: 'SELECT',
      options: ['Under £500', '£500-£1000', '£1000-£2000', '£2000+'],
      isRequired: false,
      order: 4
    },
    {
      name: 'Heard About Us',
      slug: 'referral_source',
      type: 'SELECT',
      options: ['Google Search', 'Facebook', 'Recommendation', 'Local Ad']()
