import { Router } from 'express';
import { getAllTemplates, getTemplateByName, updateTemplate } from '../controllers/email-template.controller';

const router = Router();

router.get('/', getAllTemplates);
router.get('/:templateName', getTemplateByName);
router.put('/:templateName', updateTemplate);

export default router;
