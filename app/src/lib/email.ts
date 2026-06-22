import type { Order } from '@/types'

// Email/SMS sending module.
// Currently uses placeholder logging. Replace the provider implementations
// below with real SendGrid / Twilio credentials when ready.

export interface SendResult {
  success: boolean
  messageId?: string
  error?: string
}

// ─── Email ────────────────────────────────────────────────────────────────────

export function buildEmailHtml(order: Order, approveUrl: string, declineUrl: string): string {
  const fmt = (n: number) =>
    '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Additional Scope Authorization</title></head>
<body style="margin:0;padding:0;background:#F4F8FF;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
  <!-- Header -->
  <tr><td style="background:#0B1829;padding:20px 28px">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#1355C2;border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle">
        <span style="color:white;font-size:15px;font-weight:700">SM</span>
      </td>
      <td style="padding-left:10px;color:white;font-size:16px;font-weight:600">Sea Morris</td>
    </tr></table>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:28px">
    <h1 style="margin:0 0 6px;font-size:22px;color:#0B1829">Additional Scope Authorization Required</h1>
    <p style="margin:0 0 20px;color:#4D6B8A;font-size:14px">Order ${order.id} · ${order.job_name}</p>
    <!-- Info box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F8FF;border-radius:8px;margin-bottom:20px">
      <tr><td style="padding:14px">
        <p style="margin:0 0 4px;font-size:13px;color:#4D6B8A"><strong style="color:#0F2137">Job:</strong> ${order.job_name}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#4D6B8A"><strong style="color:#0F2137">Property:</strong> ${order.property_address ?? '—'}</p>
        <p style="margin:0;font-size:13px;color:#4D6B8A"><strong style="color:#0F2137">Prepared by:</strong> Sea Morris Operations Team</p>
      </td></tr>
    </table>
    <!-- Scope description -->
    <p style="font-size:14px;line-height:1.7;color:#0F2137;margin:0 0 20px">${order.client_message || order.work_description}</p>
    <!-- Price box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1829;border-radius:10px;margin-bottom:20px">
      <tr><td style="padding:20px;text-align:center">
        <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.08em">Total Client Investment</p>
        <p style="margin:0 0 4px;font-size:32px;color:white;font-weight:700">${fmt(order.client_price)}</p>
        <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.45)">Includes labor, materials &amp; project coordination</p>
      </td></tr>
    </table>
    <!-- CTA buttons -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="48%" style="padding-right:8px">
        <a href="${approveUrl}" style="display:block;background:#0D7A4E;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:8px;font-weight:700;font-size:14px">✓ Approve Scope</a>
      </td>
      <td width="48%" style="padding-left:8px">
        <a href="${declineUrl}" style="display:block;background:white;color:#C0392B;text-decoration:none;text-align:center;padding:13px;border-radius:8px;font-weight:700;font-size:14px;border:2px solid #C0392B">Decline</a>
      </td>
    </tr></table>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#F4F8FF;padding:14px 28px;border-top:1px solid #D4E4F4">
    <p style="margin:0;font-size:11px;color:#8BAAC4;text-align:center">
      Questions? Contact Sea Morris · (512) 555-0100 · claire@seamorris.com<br>
      This link is secure and unique to ${order.client_name}.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

export function buildSmsText(order: Order, approveUrl: string): string {
  const fmt = (n: number) =>
    '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })
  const shortDesc = (order.client_message || order.work_description).substring(0, 60)
  return (
    `Sea Morris: Additional scope needed for ${order.job_name.split('–')[0].trim()}. ` +
    `${shortDesc}... Total: ${fmt(order.client_price)}. ` +
    `Review & approve: ${approveUrl} Reply STOP to opt out.`
  )
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendResult> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    // Placeholder — log and return success in dev
    console.log(`[EMAIL PLACEHOLDER] To: ${to} | Subject: ${subject}`)
    return { success: true, messageId: 'placeholder-' + Date.now() }
  }
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'orders@seamorris.com', name: 'Sea Morris' },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      return { success: false, error: body }
    }
    return { success: true, messageId: res.headers.get('X-Message-Id') ?? undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER
  if (!sid || !token || !from) {
    console.log(`[SMS PLACEHOLDER] To: ${to} | Body: ${body}`)
    return { success: true, messageId: 'placeholder-sms-' + Date.now() }
  }
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      }
    )
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.message }
    return { success: true, messageId: data.sid }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
