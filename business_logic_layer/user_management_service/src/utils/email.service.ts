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
    subject: 'FCR-SCS: Your Account Credentials - Land Acquisition Case {{caseId}}',
    bodyContent: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 12px; color: #1f2937; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #6750A4; margin: 0; font-size: 22px;">Federal Compensation &amp; Resettlement System</h2>
        <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0;">Statutory Case Management &amp; Compensation Portal (FCR-SCS)</p>
      </div>
      
      <p style="font-size: 15px;">Dear <strong>{{name}}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.5;">An account has been created for you on the <strong>FCR-SCS Platform</strong> as an affected landowner.</p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 14px 18px; border-radius: 8px; margin: 18px 0;">
        <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #166534;">Reason for Account Creation:</p>
        <p style="margin: 0 0 4px 0; font-size: 14px; color: #14532d;">Your land parcel has been officially attached to statutory acquisition case <strong>{{caseTitle}}</strong> (Case ID: <strong>{{caseId}}</strong>).</p>
        <p style="margin: 0; font-size: 13px; color: #15803d;">This account allows you to securely track case progress, view land valuation reports, review statutory Form H compensation awards, and lodge formal inquiries or objections.</p>
      </div>

      <div style="background-color: #F3EDF7; padding: 18px; border-radius: 8px; margin: 20px 0; border: 1px solid #e7d8f3;">
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Sign-In Email:</strong> <span style="color: #1e293b; font-weight: 600;">{{email}}</span></p>
        <p style="margin: 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background: #E8DEF8; color: #4a148c; padding: 3px 8px; border-radius: 4px; font-size: 15px; font-weight: bold; font-family: monospace;">{{temporaryPassword}}</code></p>
      </div>

      <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
        <p style="margin: 0; font-size: 13px; color: #9f1239; font-weight: 600;">Security Requirement: For your protection, you must change this temporary password upon your first login.</p>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="{{loginUrl}}" style="background-color: #6750A4; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">Sign In to Member Portal</a>
      </div>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">Regards,<br><strong>Land Acquisition &amp; Compensation Authority (FCR-SCS)</strong></p>
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
  },
  SYSTEM_ALERT: {
    subject: 'FCR-SCS: System Notification - {{alertType}}',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
      <h2 style="color: #0066cc;">System Notification</h2>
      <p>Hello {{name}},</p>
      <p>This is an automated system notice: <strong>{{message}}</strong></p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 6px 0;"><strong>Case ID:</strong> {{caseId}}</p>
        <p style="margin: 0 0 6px 0;"><strong>Timestamp:</strong> {{timestamp}}</p>
        <p style="margin: 0;"><strong>Severity:</strong> {{severity}}</p>
      </div>
      <a href="{{portalLink}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0;">{{buttonText}}</a>
      <p style="font-size: 12px; color: #6b7280;">If you require assistance, please contact the FCR-SCS Administrative Desk.</p>
    </div>`,
  },
  OFFER_LETTER_NOTIFICATION: {
    subject: 'FCR-SCS: Compensation Offer Notice - Case {{caseId}}',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
      <h2 style="color: #0066cc;">Official Compensation Offer Notice (Form H)</h2>
      <p>Dear {{name}},</p>
      <p>An official compensation offer and notice of award has been published for Land Acquisition Case <strong>{{caseId}}</strong> ({{caseTitle}}).</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 6px 0;"><strong>Awarded Compensation:</strong> {{amount}}</p>
        <p style="margin: 0 0 6px 0;"><strong>Lot Number:</strong> {{lotNo}}</p>
        <p style="margin: 0;"><strong>Mukim:</strong> {{mukim}}</p>
      </div>
      <p>Please log in to your Member Portal to review the detailed compensation assessment and record your formal decision.</p>
      <a href="{{portalLink}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0;">Review Offer in Portal</a>
      <br><p>Regards,<br>The Land Acquisition & Compensation Authority</p>
    </div>`,
  },
  OBJECTION_UPDATE: {
    subject: 'FCR-SCS: Status Update on Objection - Case {{caseId}}',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
      <h2 style="color: #0066cc;">Form N Objection Status Update</h2>
      <p>Dear {{name}},</p>
      <p>We are writing to update you regarding your formal Form N objection lodged for Land Acquisition Case <strong>{{caseId}}</strong>.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 6px 0;"><strong>Review Status:</strong> {{status}}</p>
        <p style="margin: 0;"><strong>Remarks:</strong> {{remarks}}</p>
      </div>
      <a href="{{portalLink}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0;">View Objection Details</a>
      <br><p>Regards,<br>Land Administrator & Compensation Board</p>
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
