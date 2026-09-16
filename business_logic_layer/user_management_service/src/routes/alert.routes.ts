import { Router } from 'express';
import {
  getAlerts,
  getAlertStats,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  testTriggerRule,
} from '../controllers/alert.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// ==========================================
// Alert Rules Management
// (Must be declared before /:alertId to prevent route collisions)
// ==========================================
router.get('/rules', authenticate, getAlertRules);
router.post('/rules', authenticate, createAlertRule);
router.put('/rules/:ruleId', authenticate, updateAlertRule);
router.delete('/rules/:ruleId', authenticate, deleteAlertRule);
router.post('/rules/:ruleId/test', authenticate, testTriggerRule);

// ==========================================
// System Alerts Feed & Acknowledgement
// ==========================================
router.get('/', authenticate, getAlerts);
router.get('/stats', authenticate, getAlertStats);
router.post('/acknowledge-all', authenticate, acknowledgeAllAlerts);
router.patch('/:alertId/acknowledge', authenticate, acknowledgeAlert);

export default router;
