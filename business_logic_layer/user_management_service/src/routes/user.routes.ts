import { Router } from 'express';
import { login, forgotPassword, resetPassword } from '../controllers/user.controller';
import { getRolePermissions, updateRolePermissions } from '../controllers/permission.controller';

const router = Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// RBAC Permissions
router.get('/permissions/:role', getRolePermissions);
router.post('/permissions/:role', updateRolePermissions);

export default router;
