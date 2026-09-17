import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { logAudit } from '../services/audit.service';
import { generateCustomId } from '../utils/idGenerator';

export const DEFAULT_TEMPLATES: Record<string, { subject: string; bodyContent: string }> = {
  PASSWORD_RESET: {
    subject: 'FCR-SCS: Password Reset Request',
    bodyContent: `<div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
  <div style="border-bottom: 2px solid #6750A4; padding-bottom: 12px; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <h2 style="color: #6750A4; margin: 0; font-size: 20px; font-weight: 700;">FCR-SCS Notification</h2>
      <span style="font-size: 11px; font-weight: 600; color: #6750A4; background-color: #F3EDF7; padding: 3px 8px; border-radius: 6px; border: 1px solid #EADDFF;">SECURITY NOTICE</span>
    </div>
    <span style="font-size: 12px; color: #64748b; margin-top: 4px; display: block;">Statutory Land Acquisition & Compensation Portal · Government of Malaysia</span>
  </div>

  <p style="font-size: 15px; color: #1e293b; line-height: 1.5;">Dear {{name}},</p>

  <p style="font-size: 14px; color: #334155; line-height: 1.6;">
    You recently requested to reset your password for your FCR-SCS portal account. Click the button below to proceed with resetting your credentials:
  </p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="{{resetLink}}" style="background-color: #6750A4; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(103,80,164,0.2);">Reset Password</a>
  </div>

  <div style="background-color: #f8fafc; border-left: 4px solid #6750A4; padding: 12px 16px; margin: 20px 0;">
    <p style="margin: 0; font-size: 13px; color: #475569;">
      This password reset link is valid for <strong>60 minutes</strong>. If you did not request a password reset, please ignore this email or contact administrative security immediately.
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
  <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
    Federal Land Commission Reimbursement & Statutory Compensation System (FCR-SCS)<br/>
    Government of Malaysia
  </p>
</div>`,
  },
  ACCOUNT_ACTIVATION: {
    subject: 'FCR-SCS: Activate Your Account',
    bodyContent: `<div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
  <div style="border-bottom: 2px solid #6750A4; padding-bottom: 12px; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <h2 style="color: #6750A4; margin: 0; font-size: 20px; font-weight: 700;">FCR-SCS Notification</h2>
      <span style="font-size: 11px; font-weight: 600; color: #6750A4; background-color: #F3EDF7; padding: 3px 8px; border-radius: 6px; border: 1px solid #EADDFF;">ACCOUNT ACTIVATION</span>
    </div>
    <span style="font-size: 12px; color: #64748b; margin-top: 4px; display: block;">Statutory Land Acquisition & Compensation Portal · Government of Malaysia</span>
  </div>

  <p style="font-size: 15px; color: #1e293b; line-height: 1.5;">Dear {{name}},</p>

  <p style="font-size: 14px; color: #334155; line-height: 1.6;">
    Thank you for registering with the FCR-SCS Statutory Land Acquisition & Compensation Portal. Please click the button below to activate your account and verify your email address:
  </p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="{{activationLink}}" style="background-color: #6750A4; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(103,80,164,0.2);">Activate Account</a>
  </div>

  <div style="background-color: #f8fafc; border-left: 4px solid #6750A4; padding: 12px 16px; margin: 20px 0;">
    <p style="margin: 0; font-size: 13px; color: #475569;">
      This activation link is valid for <strong>24 hours</strong>. If you did not register for an account, please disregard this communication.
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
  <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
    Federal Land Commission Reimbursement & Statutory Compensation System (FCR-SCS)<br/>
    Government of Malaysia
  </p>
</div>`,
  },
  OFFER_LETTER_NOTIFICATION: {
    subject: 'FCR-SCS: Compensation Offer Notice - Case {{caseId}}',
    bodyContent: `<div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
  <div style="border-bottom: 2px solid #6750A4; padding-bottom: 12px; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <h2 style="color: #6750A4; margin: 0; font-size: 20px; font-weight: 700;">FCR-SCS Notification</h2>
      <span style="font-size: 11px; font-weight: 600; color: #6750A4; background-color: #F3EDF7; padding: 3px 8px; border-radius: 6px; border: 1px solid #EADDFF;">STATUTORY OFFER NOTICE</span>
    </div>
    <span style="font-size: 12px; color: #64748b; margin-top: 4px; display: block;">Statutory Land Acquisition & Compensation Commission · Government of Malaysia</span>
  </div>

  <p style="font-size: 15px; color: #1e293b; line-height: 1.5;">Dear {{name}},</p>

  <p style="font-size: 14px; color: #334155; line-height: 1.6;">
    An official compensation award and formal Form H offer notice have been published for Land Acquisition Case <strong>{{caseId}}</strong>.
  </p>

  <div style="background-color: #F3EDF7; border-left: 4px solid #6750A4; padding: 14px 18px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0 0 6px 0; font-size: 14px; color: #1e293b;">Case Reference: <strong>{{caseId}}</strong></p>
    <p style="margin: 0; font-size: 14px; color: #1e293b;">Total Compensation Award: <strong style="color: #6750A4; font-size: 16px;">{{amount}}</strong></p>
  </div>

  <p style="font-size: 14px; color: #334155; line-height: 1.6;">
    Please log in to your Member Portal to review the formal offer letter, examine the valuation breakdown, and select your statutory response (Accept / Dispute) within the designated window.
  </p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="{{portalLink}}" style="background-color: #6750A4; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(103,80,164,0.2);">View Offer Letter & Respond</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
  <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
    Federal Land Commission Reimbursement & Statutory Compensation System (FCR-SCS)<br/>
    Land Acquisition Act 1960 (Act 486) · Government of Malaysia
  </p>
</div>`,
  },
  PAYMENT_DISBURSED: {
    subject: 'FCR-SCS: Payment Disbursed for Case {{caseId}}',
    bodyContent: `<div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
  <div style="border-bottom: 2px solid #6750A4; padding-bottom: 12px; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <h2 style="color: #6750A4; margin: 0; font-size: 20px; font-weight: 700;">FCR-SCS Notification</h2>
      <span style="font-size: 11px; font-weight: 600; color: #6750A4; background-color: #F3EDF7; padding: 3px 8px; border-radius: 6px; border: 1px solid #EADDFF;">PAYMENT DISBURSEMENT</span>
    </div>
    <span style="font-size: 12px; color: #64748b; margin-top: 4px; display: block;">Finance & Disbursement Division · Government of Malaysia</span>
  </div>

  <p style="font-size: 15px; color: #1e293b; line-height: 1.5;">Dear {{name}},</p>

  <p style="font-size: 14px; color: #334155; line-height: 1.6;">
    Your statutory compensation payment for Land Acquisition Case <strong>{{caseId}}</strong> has been approved and successfully processed.
  </p>

  <div style="background-color: #F3EDF7; border-left: 4px solid #6750A4; padding: 14px 18px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0 0 6px 0; font-size: 14px; color: #1e293b;">Disbursed Amount: <strong style="color: #6750A4; font-size: 16px;">{{amount}}</strong></p>
    <p style="margin: 0 0 6px 0; font-size: 13px; color: #475569;">EFT Reference ID: <code style="background-color: #EADDFF; padding: 2px 6px; border-radius: 4px; font-family: monospace;">{{transactionId}}</code></p>
    <p style="margin: 0; font-size: 13px; color: #475569;">Payment Method: Direct Bank Transfer (EFT)</p>
  </div>

  <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
    Please allow 1-3 business days for the funds to reflect in your designated bank account depending on interbank clearing windows.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
  <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
    Federal Land Commission Reimbursement & Statutory Compensation System (FCR-SCS)<br/>
    Finance & Statutory Disbursement Division · Government of Malaysia
  </p>
</div>`,
  },
  OBJECTION_UPDATE: {
    subject: 'FCR-SCS: Status Update on Objection - Case {{caseId}}',
    bodyContent: `<div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
  <div style="border-bottom: 2px solid #6750A4; padding-bottom: 12px; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <h2 style="color: #6750A4; margin: 0; font-size: 20px; font-weight: 700;">FCR-SCS Notification</h2>
      <span style="font-size: 11px; font-weight: 600; color: #6750A4; background-color: #F3EDF7; padding: 3px 8px; border-radius: 6px; border: 1px solid #EADDFF;">OBJECTION UPDATE</span>
    </div>
    <span style="font-size: 12px; color: #64748b; margin-top: 4px; display: block;">Land Acquisition Hearing Committee & Objections Board</span>
  </div>

  <p style="font-size: 15px; color: #1e293b; line-height: 1.5;">Dear {{name}},</p>

  <p style="font-size: 14px; color: #334155; line-height: 1.6;">
    This is an official communication regarding your formal Form N objection submitted for Land Acquisition Case <strong>{{caseId}}</strong>.
  </p>

  <div style="background-color: #F3EDF7; border-left: 4px solid #6750A4; padding: 14px 18px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0 0 6px 0; font-size: 14px; color: #1e293b;">Current Status: <strong style="color: #6750A4;">{{status}}</strong></p>
    <p style="margin: 0; font-size: 13px; color: #475569;">Hearing / Review Remarks: {{remarks}}</p>
  </div>

  <div style="text-align: center; margin: 24px 0;">
    <a href="{{portalLink}}" style="background-color: #6750A4; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(103,80,164,0.2);">Check Details in Portal</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
  <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
    Federal Land Commission Reimbursement & Statutory Compensation System (FCR-SCS)<br/>
    Land Acquisition Hearing Committee · Government of Malaysia
  </p>
</div>`,
  },
  SYSTEM_ALERT: {
    subject: 'FCR-SCS: System Notification - {{alertType}}',
    bodyContent: `<div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
  <div style="border-bottom: 2px solid #6750A4; padding-bottom: 12px; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <h2 style="color: #6750A4; margin: 0; font-size: 20px; font-weight: 700;">FCR-SCS Notification</h2>
      <span style="font-size: 11px; font-weight: 600; color: #6750A4; background-color: #F3EDF7; padding: 3px 8px; border-radius: 6px; border: 1px solid #EADDFF;">SYSTEM NOTICE</span>
    </div>
    <span style="font-size: 12px; color: #64748b; margin-top: 4px; display: block;">Administrative & Compliance Notification System</span>
  </div>

  <p style="font-size: 15px; color: #1e293b; line-height: 1.5;">Hello {{name}},</p>

  <p style="font-size: 14px; color: #334155; line-height: 1.6;">
    This is an automated system event dispatched by the FCR-SCS Administrative Platform:
  </p>

  <div style="background-color: #F3EDF7; border-left: 4px solid #6750A4; padding: 14px 18px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0 0 6px 0; font-size: 14px; color: #1e293b;">Event Type: <strong style="color: #6750A4;">{{alertType}}</strong></p>
    <p style="margin: 0 0 6px 0; font-size: 13px; color: #334155;">{{message}}</p>
    <p style="margin: 0; font-size: 12px; color: #64748b;">Timestamp: {{timestamp}}</p>
  </div>

  <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
    If you require assistance or need to escalate this event, please access the Alert & Notification Center in your administrator console.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
  <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
    Federal Land Commission Reimbursement & Statutory Compensation System (FCR-SCS)<br/>
    Government of Malaysia
  </p>
</div>`,
  },
  SYSTEM_ADMIN_OTP: {
    subject: 'FCR-SCS Security: Your Administrator Verification Code is {{otp}}',
    bodyContent: `<div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
  <div style="border-bottom: 2px solid #6750A4; padding-bottom: 12px; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <h2 style="color: #6750A4; margin: 0; font-size: 20px; font-weight: 700;">FCR-SCS Notification</h2>
      <span style="font-size: 11px; font-weight: 600; color: #6750A4; background-color: #F3EDF7; padding: 3px 8px; border-radius: 6px; border: 1px solid #EADDFF;">TWO-FACTOR AUTH</span>
    </div>
    <span style="font-size: 12px; color: #64748b; margin-top: 4px; display: block;">Identity & Access Governance · Government of Malaysia</span>
  </div>

  <p style="font-size: 15px; color: #1e293b; line-height: 1.5;">Dear {{name}},</p>

  <p style="font-size: 14px; color: #334155; line-height: 1.6;">
    A sign-in attempt to the FCR-SCS Administrative Console was initiated for your account. Please use the following One-Time Password (OTP) to complete your two-factor verification:
  </p>

  <div style="text-align: center; margin: 25px 0;">
    <span style="display: inline-block; font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 14px 32px; background-color: #F3EDF7; color: #21005D; border-radius: 8px; border: 1px dashed #6750A4;">{{otp}}</span>
  </div>

  <div style="background-color: #f8fafc; border-left: 4px solid #6750A4; padding: 12px 16px; margin: 20px 0;">
    <p style="margin: 0; font-size: 13px; color: #475569;">
      This code is valid for <strong>{{expiresMinutes}} minutes</strong>. If you did not initiate this login request, immediately notify the Chief Security Officer and rotate your credentials.
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
  <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
    Federal Land Commission Reimbursement & Statutory Compensation System (FCR-SCS)<br/>
    Government of Malaysia
  </p>
</div>`,
  },
  TEMPORARY_CREDENTIALS: {
    subject: 'FCR-SCS: Your Account Credentials - Land Acquisition Case {{caseId}}',
    bodyContent: `<div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
  <div style="border-bottom: 2px solid #6750A4; padding-bottom: 12px; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <h2 style="color: #6750A4; margin: 0; font-size: 20px; font-weight: 700;">FCR-SCS Notification</h2>
      <span style="font-size: 11px; font-weight: 600; color: #6750A4; background-color: #F3EDF7; padding: 3px 8px; border-radius: 6px; border: 1px solid #EADDFF;">MEMBER PORTAL CREDENTIALS</span>
    </div>
    <span style="font-size: 12px; color: #64748b; margin-top: 4px; display: block;">Statutory Case Management & Compensation Portal (FCR-SCS)</span>
  </div>

  <p style="font-size: 15px; color: #1e293b; line-height: 1.5;">Dear <strong>{{name}}</strong>,</p>

  <p style="font-size: 14px; color: #334155; line-height: 1.6;">
    An account has been created for you on the <strong>FCR-SCS Platform</strong> as an affected landowner attached to statutory acquisition case <strong>{{caseTitle}}</strong> (Case ID: <strong>{{caseId}}</strong>).
  </p>

  <div style="background-color: #F3EDF7; padding: 16px 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #EADDFF;">
    <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Sign-In Email:</strong> <span style="color: #1e293b; font-weight: 600;">{{email}}</span></p>
    <p style="margin: 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background: #E8DEF8; color: #4a148c; padding: 3px 8px; border-radius: 4px; font-size: 15px; font-weight: bold; font-family: monospace;">{{temporaryPassword}}</code></p>
  </div>

  <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
    <p style="margin: 0; font-size: 13px; color: #9f1239; font-weight: 600;">
      Security Requirement: For your protection, you must change this temporary password upon your first login.
    </p>
  </div>

  <div style="text-align: center; margin: 24px 0;">
    <a href="{{loginUrl}}" style="background-color: #6750A4; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(103,80,164,0.2);">Sign In to Member Portal</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
  <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
    Federal Land Commission Reimbursement & Statutory Compensation System (FCR-SCS)<br/>
    Government of Malaysia
  </p>
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
