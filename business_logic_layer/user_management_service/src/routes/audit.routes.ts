import { Router } from 'express';
import {
  getAuditLogs,
  getAuditStats,
  exportAuditLogsCsv,
  archiveOldLogs,
} from '../controllers/audit.controller';

const router = Router();

router.get('/', getAuditLogs);
router.get('/stats', getAuditStats);
router.get('/export/csv', exportAuditLogsCsv);
router.post('/archive', archiveOldLogs);

export default router;
