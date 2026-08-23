import { Router } from 'express';
import { login, forgotPassword, resetPassword, register, activateAccount, adminCreateUser, getAllUsers } from '../controllers/user.controller';
import { getRolePermissions, updateRolePermissions } from '../controllers/permission.controller';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/', getAllUsers);
router.post('/activate', activateAccount);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/admin-create', adminCreateUser);

// RBAC Permissions
router.get('/permissions/:role', getRolePermissions);
router.post('/permissions/:role', updateRolePermissions);

export default router;
