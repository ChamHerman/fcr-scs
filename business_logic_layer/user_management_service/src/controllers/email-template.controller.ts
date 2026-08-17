import { Request, Response } from 'express';
import { prisma } from '../prisma';

export async function getAllTemplates(req: Request, res: Response): Promise<void> {
  try {
    const templates = await prisma.emailTemplate.findMany();
    res.json(templates);
  } catch (error) {
    console.error('[EmailTemplate Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTemplateByName(req: Request, res: Response): Promise<any> {
  try {
    const templateNameParam = req.query.templateName;
    const templateName = typeof templateNameParam === 'string' ? templateNameParam : undefined;

    if (templateName) {
      const template = await prisma.emailTemplate.findUnique({
        where: { templateName },
      });
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      return res.json(template);
    } else {
      const templates = await prisma.emailTemplate.findMany();
      return res.json(templates);
    }
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

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
    });

    res.json({
      message: 'Email template updated successfully',
      template: updatedTemplate,
    });
  } catch (error: any) {
    console.error('[EmailTemplate Error]', error);
    if (error.code === 'P2025') { // Prisma code for record not found
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}
