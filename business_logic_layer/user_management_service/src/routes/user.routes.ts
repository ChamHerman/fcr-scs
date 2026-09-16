import { Router } from 'express';
import { 
  login, 
  verifyOtp, 
  resendOtp, 
  forgotPassword, 
  resetPassword, 
  register, 
  activateAccount, 
  adminCreateUser, 
  getAllUsers, 
  getUserById, 
  toggleUserStatus, 
  resolveIc,
  lookupByIc,
  changeInitialPassword,
  getProfile,
  updateProfile,
  verifyEmailChange,
  changePassword
} from '../controllers/user.controller';
import { getRolePermissions, updateRolePermissions } from '../controllers/permission.controller';

const router = Router();

router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/register', register);
router.get('/', getAllUsers);
router.get('/resolve-ic/:ic', resolveIc);
router.get('/lookup-by-ic/:ic', lookupByIc);
router.post('/activate', activateAccount);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/admin-create', adminCreateUser);
router.post('/change-initial-password', changeInitialPassword);
router.post('/change-password', changePassword);
router.get('/profile/:id', getProfile);
router.put('/profile/:id', updateProfile);
router.get('/verify-email-change', verifyEmailChange);

// RBAC Permissions
router.get('/permissions/:role', getRolePermissions);
router.post('/permissions/:role', updateRolePermissions);

router.get('/:id', getUserById);
router.post('/:id/toggle-status', toggleUserStatus);

export default router;

