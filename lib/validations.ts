import { z } from 'zod'

// Lead validation schemas
export const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  postcode: z.string().optional(),
  productTypeId: z.string().optional(),
  jobValue: z.number().positive().optional(),
  estimatedValue: z.number().positive().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  source: z.string().optional(),
  notes: z.string().optional(),
  customFieldValues: z.record(z.any()).default({})
})

export const updateLeadSchema = createLeadSchema.partial()

export const updateLeadStatusSchema = z.object({
  statusId: z.string().min(1, 'Status is required')
})

// Tenant validation schemas
export const createTenantSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  industry: z.string().min(1, 'Industry is required'),
  timezone: z.string().default('Europe/London')
})

export const updateTenantSettingsSchema = z.object({
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).default('09:00'),
  workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).default('17:00'),
  workingDays: z.array(z.number().min(1).max(7)).default([1, 2, 3, 4, 5]),
  defaultEmailSender: z.string().optional(),
  defaultSmsSender: z.string().optional(),
  autoAssignLeads: z.boolean().default(false),
  leadSlaHours: z.number().positive().default(24),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3b82f6'),
  logo: z.string().optional()
})

// Membership validation schemas
export const createMembershipSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT']).default('AGENT')
})

export const updateMembershipSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT'])
})

// Appointment validation schemas
export const createAppointmentSchema = z.object({
  type: z.enum(['CALL', 'MEETING', 'SITE_VISIT', 'DEMO', 'CONSULTATION', 'FOLLOW_UP']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startsAt: z.string().datetime('Invalid date format'),
  endsAt: z.string().datetime('Invalid date format').optional(),
  location: z.string().optional(),
  notes: z.string().optional()
})

// Message validation schemas
export const sendMessageSchema = z.object({
  channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']),
  templateId: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().min(1, 'Message body is required'),
  to: z.string().min(1, 'Recipient is required')
})

// Template validation schemas
export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']),
  subject: z.string().optional(),
  body: z.string().min(1, 'Template body is required')
})

// Lead Status validation schemas
export const createLeadStatusSchema = z.object({
  name: z.string().min(1, 'Status name is required'),
  slug: z.string()
    .min(1, 'Status slug is required')
    .regex(/^[a-z0-9_]+$/, 'Slug can only contain lowercase letters, numbers, and underscores'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  order: z.number().int().min(0),
  isDefault: z.boolean().default(false),
  isFinal: z.boolean().default(false)
})

// Product Type validation schemas
export const createProductTypeSchema = z.object({
  name: z.string().min(1, 'Product type name is required'),
  slug: z.string()
    .min(1, 'Product type slug is required')
    .regex(/^[a-z0-9_-]+$/, 'Slug can only contain lowercase letters, numbers, hyphens, and underscores'),
  description: z.string().optional(),
  order: z.number().int().min(0).default(0)
})

// Custom Field validation schemas
export const createCustomFieldSchema = z.object({
  name: z.string().min(1, 'Field name is required'),
  slug: z.string()
    .min(1, 'Field slug is required')
    .regex(/^[a-z0-9_]+$/, 'Slug can only contain lowercase letters, numbers, and underscores'),
  type: z.enum(['TEXT', 'NUMBER', 'SELECT', 'MULTISELECT', 'DATE', 'BOOLEAN', 'TEXTAREA']),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  order: z.number().int().min(0).default(0)
})

// Public lead form validation (for embeds)
export const publicLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  postcode: z.string().optional(),
  message: z.string().optional(),
  source: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  customFieldValues: z.record(z.any()).default({})
})
