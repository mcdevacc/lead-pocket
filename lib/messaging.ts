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
    const whatsappTo = to.startsWith('whatsapp:') ? to : `wh
