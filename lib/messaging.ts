import twilio from 'twilio'
import sgMail from '@sendgrid/mail'

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export interface SendMessageParams {
  to: string
  body: string
  subject?: string
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL'
  from?: string
}

export interface MessageResult {
  success: boolean
  providerId?: string
  error?: string
}

export async function sendSMS({ to, body, from }: SendMessageParams): Promise<MessageResult> {
  try {
    const message = await twilioClient.messages.create({
      body,
      from: from || process.env.TWILIO_PHONE_NUMBER,
      to
    })
    
    return {
      success: true,
      providerId: message.sid
    }
  } catch (error: any) {
    console.error('SMS send error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export async function sendWhatsApp({ to, body, from }: SendMessageParams): Promise<MessageResult> {
  try {
    // Ensure WhatsApp format
    const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
    const whatsappFrom = from || process.env.TWILIO_WHATSAPP_NUMBER
    
    const message = await twilioClient.messages.create({
      body,
      from: whatsappFrom,
      to: whatsappTo
    })
    
    return {
      success: true,
      providerId: message.sid
    }
  } catch (error: any) {
    console.error('WhatsApp send error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export async function sendEmail({ to, subject, body, from }: SendMessageParams): Promise<MessageResult> {
  try {
    const msg = {
      to,
      from: from || process.env.SENDGRID_FROM_EMAIL!,
      subject: subject || 'Message from Lead Pocket',
      html: body,
      text: body.replace(/<[^>]*>/g, '') // Strip HTML for text version
    }
    
    const [response] = await sgMail.send(msg)
    
    return {
      success: true,
      providerId: response.headers['x-message-id'] as string
    }
  } catch (error: any) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export async function sendMessage(params: SendMessageParams): Promise<MessageResult> {
  switch (params.channel) {
    case 'SMS':
      return sendSMS(params)
    case 'WHATSAPP':
      return sendWhatsApp(params)
    case 'EMAIL':
      return sendEmail(params)
    default:
      return {
        success: false,
        error: 'Invalid channel'
      }
  }
}

// Template processing
export function processTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
    const value = key.split('.').reduce((obj: any, k: string) => obj?.[k], variables)
    return value !== undefined ? String(value) : match
  })
}

// Common template variables helper
export function getTemplateVariables(lead: any, tenant: any, user?: any) {
  return {
    lead: {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      address: lead.address,
      postcode: lead.postcode,
      jobValue: lead.jobValue,
      estimatedValue: lead.estimatedValue
    },
    tenant: {
      name: tenant.name,
      businessName: tenant.settings?.businessName || tenant.name,
      businessPhone: tenant.settings?.businessPhone,
      businessEmail: tenant.settings?.businessEmail,
      website: tenant.settings?.website
    },
    user: user ? {
      name: user.name,
      email: user.email
    } : undefined
  }
}
