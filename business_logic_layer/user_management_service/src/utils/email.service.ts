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

const STOCK_TEMPLATES: Record<string, { subject: string; bodyContent: string }> = {
  PASSWORD_RESET: {
    subject: 'FCR-SCS: Password Reset Request',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px;">
      <h2>Password Reset Request</h2>
      <p>Hi {{name}},</p>
      <p>You recently requested to reset your password for your FCR-SCS account. Click the button below to reset it:</p>
      <a href="{{resetLink}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Password</a>
      <p>If you did not request a password reset, please ignore this email. This link is valid for 60 minutes.</p>
      <br><p>Thanks,<br>The FCR-SCS Team</p>
    </div>`,
  },
  ACCOUNT_ACTIVATION: {
    subject: 'FCR-SCS: Activate Your Account',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px;">
      <h2>Activate Your Account</h2>
      <p>Hi {{name}},</p>
      <p>Thank you for registering with FCR-SCS. Please click the button below to activate your account:</p>
      <a href="{{activationLink}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Activate Account</a>
      <p>If you did not register for an account, please ignore this email.</p>
      <br><p>Thanks,<br>The FCR-SCS Team</p>
    </div>`,
  },
  TEMPORARY_CREDENTIALS: {
    subject: 'FCR-SCS: Your Account Credentials',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
      <h2 style="color: #0066cc;">Welcome to FCR-SCS</h2>
      <p>Dear {{name}},</p>
      <p>An administrator has provisioned an account for you with the role of <strong>{{role}}</strong>.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Login Email:</strong> {{email}}</p>
        <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 1.1em;">{{temporaryPassword}}</code></p>
      </div>
      <p style="color: #b91c1c; font-weight: bold;">Important: For security reasons, you are required to change this temporary password upon your first login.</p>
      <a href="{{loginUrl}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0;">Sign In to Your Account</a>
      <br><p>Regards,<br>The FCR-SCS Administration Team</p>
    </div>`,
  },
  ADMIN_PASSWORD_RESET: {
    subject: 'FCR-SCS: Your Password Has Been Reset',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
      <h2 style="color: #0066cc;">Password Reset By Administrator</h2>
      <p>Dear {{name}},</p>
      <p>An administrator has reset your password for your FCR-SCS account (Role: <strong>{{role}}</strong>).</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Login Email:</strong> {{email}}</p>
        <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 1.1em;">{{temporaryPassword}}</code></p>
      </div>
      <p style="color: #b91c1c; font-weight: bold;">Important: You are required to change this temporary password upon your next login.</p>
      <a href="{{loginUrl}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0;">Sign In to Your Account</a>
      <br><p>Regards,<br>The FCR-SCS Administration Team</p>
    </div>`,
  },
  EMAIL_CHANGE_VERIFICATION: {
    subject: 'FCR-SCS: Verify Your New Email Address',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
      <h2 style="color: #0066cc;">Email Address Verification</h2>
      <p>Dear {{name}},</p>
      <p>You requested to update your registered email address on the FCR-SCS platform to <strong>{{newEmail}}</strong>.</p>
      <p>Your current login email will remain unchanged until you confirm this change.</p>
      <a href="{{verificationLink}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Confirm New Email Address</a>
      <p>If you did not initiate this request, please contact your system administrator immediately.</p>
      <br><p>Regards,<br>The FCR-SCS Administration Team</p>
    </div>`,
  }
};

/**
 * Sends an email using a database template or built-in stock template.
 * @param to Recipient email address
 * @param templateName The name of the template (e.g., 'PASSWORD_RESET', 'TEMPORARY_CREDENTIALS')
 * @param variables Key-value pairs to replace in the template
 */
export async function sendTemplatedEmail(to: string, templateName: string, variables: Record<string, string>) {
  try {
    // 1. Fetch template from database or fallback to stock
    let template = await prisma.emailTemplate.findUnique({
      where: { templateName },
    });

    let subject = template?.subject || STOCK_TEMPLATES[templateName]?.subject;
    let body = template?.bodyContent || STOCK_TEMPLATES[templateName]?.bodyContent;

    if (!subject || !body) {
      throw new Error(`Email template '${templateName}' not found in database or stock presets.`);
    }

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
