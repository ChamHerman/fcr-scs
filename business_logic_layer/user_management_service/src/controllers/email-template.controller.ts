import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { logAudit } from '../services/audit.service';
import { generateCustomId } from '../utils/idGenerator';

export const DEFAULT_TEMPLATES: Record<string, { subject: string; bodyContent: string }> = {
  PASSWORD_RESET: {
    subject: 'FCR-SCS: Password Reset Request',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px;">
  <h2>Password Reset Request</h2>
  <p>Hi {{name}},</p>
  <p>You recently requested to reset your password for your FCR-SCS account. Click the button below to reset it:</p>
  <a href="{{resetLink}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Password</a>
  <p>If you did not request a password reset, please ignore this email or reply to let us know. This password reset link is only valid for the next 60 minutes.</p>
  <br>
  <p>Thanks,<br>The FCR-SCS Team</p>
</div>`,
  },
  ACCOUNT_ACTIVATION: {
    subject: 'FCR-SCS: Activate Your Account',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px;">
  <h2>Activate Your Account</h2>
  <p>Hi {{name}},</p>
  <p>Thank you for registering with FCR-SCS. Please click the button below to activate your account:</p>
  <a href="{{activationLink}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Activate Account</a>
  <p>If you did not register for an account, please ignore this email. This link is valid for 24 hours.</p>
  <br>
  <p>Thanks,<br>The FCR-SCS Team</p>
</div>`,
  },
  OFFER_LETTER_NOTIFICATION: {
    subject: 'FCR-SCS: Compensation Offer Notice - Case {{caseId}}',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px;">
  <h2>Official Compensation Offer Notice</h2>
  <p>Dear {{name}},</p>
  <p>An official compensation offer has been published for Land Acquisition Case <strong>{{caseId}}</strong>.</p>
  <p>Total awarded amount: <strong>{{amount}}</strong></p>
  <p>Please log in to your Member Portal to review the formal offer letter and select your response (Accept / Dispute) within the statutory window:</p>
  <a href="{{portalLink}}" style="background-color: #2e7d32; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">View Offer Letter</a>
  <br>
  <p>Regards,<br>Land Acquisition & Compensation Department</p>
</div>`,
  },
  PAYMENT_DISBURSED: {
    subject: 'FCR-SCS: Payment Disbursed for Case {{caseId}}',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px;">
  <h2>Compensation Payment Disbursed</h2>
  <p>Dear {{name}},</p>
  <p>Your compensation payment of <strong>{{amount}}</strong> for Case <strong>{{caseId}}</strong> has been approved and processed.</p>
  <p>Reference Transaction ID: <code>{{transactionId}}</code></p>
  <p>Payment Method: Direct Bank Transfer (EFT)</p>
  <p>Please allow 1-3 business days for the funds to reflect in your designated bank account.</p>
  <br>
  <p>Regards,<br>Finance & Disbursement Division</p>
</div>`,
  },
  OBJECTION_UPDATE: {
    subject: 'FCR-SCS: Status Update on Objection - Case {{caseId}}',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px;">
  <h2>Objection Status Update</h2>
  <p>Dear {{name}},</p>
  <p>We are writing to update you on your formal objection regarding Land Acquisition Case <strong>{{caseId}}</strong>.</p>
  <p>Current Status: <strong>{{status}}</strong></p>
  <p>Remarks: {{remarks}}</p>
  <a href="{{portalLink}}" style="background-color: #6750a4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Check Details in Portal</a>
  <br>
  <p>Regards,<br>Land Acquisition Hearing Committee</p>
</div>`,
  },
  SYSTEM_ALERT: {
    subject: 'FCR-SCS: System Notification - {{alertType}}',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px;">
  <h2>System Notification</h2>
  <p>Hello {{name}},</p>
  <p>This is an automated system notice: <strong>{{message}}</strong></p>
  <p>Timestamp: {{timestamp}}</p>
  <p>If you require assistance, please reach out to the System Administrator.</p>
  <br>
  <p>FCR-SCS Administrative Services</p>
</div>`,
  },
  SYSTEM_ADMIN_OTP: {
    subject: 'FCR-SCS Security: Your Administrator Verification Code is {{otp}}',
    bodyContent: `<div style="font-family: sans-serif; padding: 20px; max-width: 540px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #6750a4; margin-top: 0;">System Administrator Authentication</h2>
  <p>Dear {{name}},</p>
  <p>A login request to the FCR-SCS Administrative Console was initiated for your account. Please use the following One-Time Password (OTP) to complete your two-factor verification:</p>
  <div style="text-align: center; margin: 25px 0;">
    <span style="display: inline-block; font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 28px; background-color: #f3edf7; color: #21005d; border-radius: 8px; border: 1px dashed #6750a4;">{{otp}}</span>
  </div>
  <p style="color: #49454f; font-size: 14px;">This code is valid for <strong>{{expiresMinutes}} minutes</strong>. If you did not initiate this login, please immediately notify the security operations team.</p>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
  <p style="font-size: 12px; color: #79747e;">Federal Land Commission Reimbursement & Statutory Compensation System (FCR-SCS)</p>
</div>`,
  },
};

export async function getAllTemplates(req: Request, res: Response): Promise<void> {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { templateName: 'asc' },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
    res.json(templates);
  } catch (error) {
    console.error('[EmailTemplate Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTemplateByName(req: Request, res: Response): Promise<any> {
  try {
    const param = typeof req.params.templateName === 'string' ? req.params.templateName : undefined;
    const query = typeof req.query.templateName === 'string' ? req.query.templateName : undefined;
    const templateNameParam = param || query;

    if (templateNameParam) {
      const template = await prisma.emailTemplate.findUnique({
        where: { templateName: templateNameParam },
        include: {
          createdBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      return res.json(template);
    } else {
      const templates = await prisma.emailTemplate.findMany({
        orderBy: { templateName: 'asc' },
      });
      return res.json(templates);
    }
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export const updateTemplate = async (req: Request, res: Response): Promise<any> => {
  try {
    const templateName = req.params.templateName as string;
    const { subject, bodyContent } = req.body;

    if (!subject || !bodyContent) {
      res.status(400).json({ error: 'Subject and bodyContent are required' });
      return;
    }

    const updatedTemplate = await prisma.emailTemplate.update({
      where: { templateName },
      data: {
        subject,
        bodyContent,
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    logAudit({
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'EMAIL_TEMPLATE_UPDATED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { templateName, subject },
      systemResponse: 'SUCCESS (200)',
    });

    res.json({
      message: 'Email template updated successfully',
      template: updatedTemplate,
    });
  } catch (error: any) {
    console.error('[EmailTemplate Error]', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTemplate = async (req: Request, res: Response): Promise<any> => {
  try {
    const { templateName, subject, bodyContent } = req.body;

    if (!templateName || !subject || !bodyContent) {
      return res.status(400).json({ error: 'templateName, subject, and bodyContent are required' });
    }

    const normalizedName = templateName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    const adminUser = await prisma.user.findFirst({
      where: { role: 'SYSTEM_ADMINISTRATOR' },
    });

    if (!adminUser) {
      return res.status(500).json({ error: 'System administrator user not found' });
    }

    const templateId = await generateCustomId('emailTemplate');
    const template = await prisma.emailTemplate.create({
      data: {
        templateId,
        templateName: normalizedName,
        subject,
        bodyContent,
        createdById: adminUser.userId,
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    logAudit({
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'EMAIL_TEMPLATE_CREATED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { templateName: normalizedName, subject },
      systemResponse: 'CREATED (201)',
    });

    return res.status(201).json({
      message: 'Email template created successfully',
      template,
    });
  } catch (error: any) {
    console.error('[EmailTemplate Error]', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Template with this name already exists' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetTemplate = async (req: Request, res: Response): Promise<any> => {
  try {
    const templateName = req.params.templateName as string;
    const defaults = DEFAULT_TEMPLATES[templateName];

    if (!defaults) {
      return res.status(400).json({ error: `No default stock template configured for '${templateName}'` });
    }

    const updatedTemplate = await prisma.emailTemplate.update({
      where: { templateName },
      data: {
        subject: defaults.subject,
        bodyContent: defaults.bodyContent,
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    logAudit({
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'EMAIL_TEMPLATE_RESET',
      moduleName: 'USER_MANAGEMENT',
      severity: 'WARNING',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { templateName, action: 'Reset to stock default content' },
      systemResponse: 'SUCCESS (200)',
    });

    return res.json({
      message: 'Email template reset to default successfully',
      template: updatedTemplate,
    });
  } catch (error: any) {
    console.error('[EmailTemplate Error]', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Template not found' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};
