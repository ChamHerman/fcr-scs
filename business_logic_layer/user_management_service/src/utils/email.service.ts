import nodemailer from "nodemailer";
import { prisma } from "../prisma";

// Create a reusable transporter using Gmail SMTP
// You must provide your Gmail address and an App Password in the .env file.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER, // e.g., your.email@gmail.com
    pass: process.env.SMTP_PASS, // e.g., your 16-character App Password
  },
});

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

    // 3. Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"FCR-SCS System" <noreply@fcrscs.gov.my>',
      to,
      subject,
      html: body,
    });

    console.log(`[EmailService] Sent email '${templateName}' to ${to}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${to}:`, error);
    throw error;
  }
}
