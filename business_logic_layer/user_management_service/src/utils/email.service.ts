import nodemailer from "nodemailer";
import { prisma } from "../prisma";

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Sends an email using a database template.
 * @param to Recipient email address
 * @param templateName The name of the template in the database (e.g., 'PASSWORD_RESET')
 * @param variables Key-value pairs to replace in the template (e.g., { name: 'John', token: '123' })
 */
export async function sendTemplatedEmail(to: string, templateName: string, variables: Record<string, string>) {
  try {
    // 1. Fetch template from database
    const template = await prisma.emailTemplate.findUnique({
      where: { templateName },
    });

    if (!template) {
      throw new Error(`Email template '${templateName}' not found in database.`);
    }

    // 2. Replace variables in subject and body
    let subject = template.subject;
    let body = template.bodyContent;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
    }

    // 3. Resolve destination email
    // In development/testing, dummy @fcrscs.gov.my addresses (like admin@fcrscs.gov.my)
    // are rerouted to ADMIN_EMAIL_OVERRIDE or the authenticated SMTP_USER address.
    let destination = to;
    const isDummyAddress = to.toLowerCase().endsWith('@fcrscs.gov.my');
    const overrideEmail = process.env.ADMIN_EMAIL_OVERRIDE || process.env.SMTP_USER;

    if (isDummyAddress && overrideEmail) {
      console.log(`[EmailService] Rerouting dummy recipient '${to}' -> '${overrideEmail}'`);
      destination = overrideEmail;
    }

    // 4. Send email
    const fromAddress = process.env.EMAIL_FROM || `"FCR-SCS System" <${process.env.SMTP_USER || 'noreply@fcrscs.gov.my'}>`;
    const info = await getTransporter().sendMail({
      from: fromAddress,
      to: destination,
      subject,
      html: body,
    });

    console.log(`[EmailService] Sent email '${templateName}' to ${to} (delivered to: ${destination}). MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${to}:`, error);
    throw error;
  }
}
