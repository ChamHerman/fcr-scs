import { Router } from 'express';
import {
  getAllTemplates,
  getTemplateByName,
  updateTemplate,
  createTemplate,
  resetTemplate,
} from '../controllers/email-template.controller';

const router = Router();

router.get('/', getAllTemplates);
router.post('/', createTemplate);
router.get('/:templateName', getTemplateByName);
router.put('/:templateName', updateTemplate);
router.post('/:templateName/reset', resetTemplate);

export default router;
