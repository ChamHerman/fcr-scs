import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MD3Card, MD3Button } from '../MD3Components';
import { ArrowLeft, User, Mail, Phone, CreditCard, Calendar, Shield, AlertTriangle, Key, Edit, Power, PowerOff, MapPin, Copy, Check, CheckCircle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useNotification } from '../../components/ui/NotificationSystem';
import { Modal } from '../../components/ui/Modal';
import '../LandAcquisition/case_management.css';

export const UserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isConfirmResetModalOpen, setIsConfirmResetModalOpen] = useState(false);
  const [tempPasswordResult, setTempPasswordResult] = useState<string | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  const roleFormatMap: Record<string, string> = {
    SYSTEM_ADMINISTRATOR: 'System Administrator',
    GOVERNMENT_ADMINISTRATOR: 'Government Administrator',
    GOVERNMENT_OFFICER: 'Government Officer',
    LAND_VALUER: 'Land Valuer',
    DISPLACED_COMMUNITY_MEMBER: 'Displaced Community Member',
  };

  const formatRole = (role: string) => roleFormatMap[role] || role;

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`http://localhost:3030/api/users/${id}`);
      const json = await res.json();
      if (json.success) {
        setUser(json.data);
      } else {
        notify({ type: 'error', title: 'Error', message: json.error || 'User not found' });
      }
    } catch (e) {
      console.error('Failed to fetch user', e);
      notify({ type: 'error', title: 'Network Error', message: 'Could not fetch user details.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchUser();
  }, [id]);

  const toggleStatus = async () => {
    if (!user) return;
    
    // Safety check for system admin
    if (user.role === 'SYSTEM_ADMINISTRATOR' && user.isActive) {
      if (!window.confirm('WARNING: You are about to deactivate a System Administrator account. Proceed?')) {
        return;
      }
    }

    try {
      setIsTogglingStatus(true);
      const res = await fetch(`http://localhost:3030/api/users/${id}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive })
      });
      const json = await res.json();
      
      if (res.ok && json.success) {
        notify({ 
          type: 'success', 
          title: 'Status Updated', 
          message: json.message || `User successfully ${!user.isActive ? 'activated' : 'deactivated'}` 
        });
        fetchUser(); // Refresh details
      } else {
        notify({ type: 'error', title: 'Update Failed', message: json.error || 'Failed to update user status' });
      }
    } catch (e) {
      notify({ type: 'error', title: 'Network Error', message: 'Could not update status.' });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;
    try {
      setIsResettingPassword(true);
      const res = await fetch(`http://localhost:3030/api/users/${id}/admin-reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setIsConfirmResetModalOpen(false);
        setTempPasswordResult(json.temporaryPassword);
        notify({
          type: 'success',
          title: 'Password Reset Successful',
          message: 'A temporary password has been generated and dispatched to the user\'s email.',
        });
      } else {
        notify({
          type: 'error',
          title: 'Password Reset Failed',
          message: json.error || 'Failed to reset password.',
        });
      }
    } catch (e) {
      notify({ type: 'error', title: 'Network Error', message: 'Could not contact server to reset password.' });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const copyTemporaryPassword = (password: string) => {
    navigator.clipboard.writeText(password);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center text-md-on-surface-variant">
        <div className="animate-pulse">Loading user details...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <MD3Card className="p-8">
          <AlertTriangle size={48} className="mx-auto text-md-error mb-4" />
          <h2 className="text-xl font-medium text-md-on-surface mb-2">User Not Found</h2>
          <p className="text-md-on-surface-variant mb-6">The user you are looking for does not exist or you do not have permission to view them.</p>
          <MD3Button variant="outlined" onClick={() => navigate('/admin/users')}>Back to User Administration</MD3Button>
        </MD3Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="User Details"
        subtitle={`Viewing profile and administrative permissions for ${user.name}`}
        backPath="/admin/users"
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div className="flex items-center">
          <div className="w-16 h-16 rounded-full bg-md-primary/10 text-md-primary flex items-center justify-center mr-4 text-2xl font-bold uppercase">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-medium text-md-on-surface mb-1">{user.name}</h1>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-md-secondary-container text-md-on-secondary-container whitespace-nowrap">
                <Shield size={12} className="mr-1" />
                {formatRole(user.role)}
              </span>
              <span className={`status-badge ${user.isActive ? 'status-valuation-approved' : 'status-valuation-rejected'}`}>
                <span className="dot"></span>
                {user.isActive ? 'Active Account' : 'Inactive Account'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <MD3Card elevation={1} className="p-6">
          <h3 className="text-lg font-medium text-md-on-surface mb-4 border-b border-md-outline/10 pb-2">Contact Information</h3>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <Mail size={20} className="text-md-on-surface-variant mr-3 mt-0.5" />
              <div>
                <div className="text-xs text-md-on-surface-variant mb-1 uppercase font-medium tracking-wider">Email Address</div>
                <div className="text-md-on-surface">{user.email}</div>
              </div>
            </div>
            
            <div className="flex items-start">
              <Phone size={20} className="text-md-on-surface-variant mr-3 mt-0.5" />
              <div>
                <div className="text-xs text-md-on-surface-variant mb-1 uppercase font-medium tracking-wider">Contact Number</div>
                <div className="text-md-on-surface">{user.contactNumber || 'Not provided'}</div>
              </div>
            </div>

            {user.address && (
              <div className="flex items-start">
                <MapPin size={20} className="text-md-on-surface-variant mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-md-on-surface-variant mb-1 uppercase font-medium tracking-wider">Residential Address</div>
                  <div className="text-md-on-surface">{user.address}</div>
                </div>
              </div>
            )}
          </div>
        </MD3Card>

        <MD3Card elevation={1} className="p-6">
          <h3 className="text-lg font-medium text-md-on-surface mb-4 border-b border-md-outline/10 pb-2">Identity & Account</h3>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <CreditCard size={20} className="text-md-on-surface-variant mr-3 mt-0.5" />
              <div>
                <div className="text-xs text-md-on-surface-variant mb-1 uppercase font-medium tracking-wider">Identification Number</div>
                <div className="text-md-on-surface font-mono">{user.identificationNumber || 'Not provided'}</div>
              </div>
            </div>
            
            <div className="flex items-start">
              <Calendar size={20} className="text-md-on-surface-variant mr-3 mt-0.5" />
              <div>
                <div className="text-xs text-md-on-surface-variant mb-1 uppercase font-medium tracking-wider">Account Created</div>
                <div className="text-md-on-surface">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                </div>
              </div>
            </div>
          </div>
        </MD3Card>
      </div>

      <h3 className="text-xl font-medium text-md-on-surface mb-4 mt-8">Administrative Actions</h3>
      <MD3Card elevation={1} className="p-6 bg-md-surface-variant/10 border border-md-outline/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="border border-md-outline/20 p-4 rounded-2xl flex flex-col justify-between bg-md-surface-container-low">
            <div>
              <div className="flex items-center mb-2">
                {user.isActive ? <PowerOff size={18} className="text-md-error mr-2" /> : <Power size={18} className="text-green-700 dark:text-green-500 mr-2" />}
                <h4 className="font-medium text-md-on-surface">{user.isActive ? 'Deactivate Account' : 'Activate Account'}</h4>
              </div>
              <p className="text-sm text-md-on-surface-variant mb-4">
                {user.isActive 
                  ? "Prevent this user from logging in. Their data will remain in the system, but they will not be able to access the platform." 
                  : "Restore access to this user. They will immediately be able to log in with their existing credentials."}
              </p>
            </div>
            <MD3Button 
              variant={user.isActive ? "outlined" : "filled"} 
              className={user.isActive 
                ? "border-md-error text-md-error hover:bg-md-error/10 hover:shadow-md hover:border-md-primary hover:text-[1.05rem] transition-all duration-200" 
                : "bg-green-700 hover:bg-green-800 text-white hover:shadow-md border border-transparent hover:border-md-primary hover:text-[1.05rem] transition-all duration-200"}
              onClick={toggleStatus}
              disabled={isTogglingStatus}
            >
              {isTogglingStatus ? 'Processing...' : user.isActive ? 'Deactivate User' : 'Activate User'}
            </MD3Button>
          </div>

          <div className="border border-md-outline/20 p-4 rounded-2xl flex flex-col justify-between bg-md-surface-container-low">
            <div>
              <div className="flex items-center mb-2">
                <Key size={18} className="text-md-primary mr-2" />
                <h4 className="font-medium text-md-on-surface">Reset Password</h4>
              </div>
              <p className="text-sm text-md-on-surface-variant mb-4">
                Generate a temporary password and send it to the user's registered email address.
              </p>
            </div>
            <MD3Button 
              variant="tonal" 
              className="hover:shadow-md border border-transparent hover:border-md-primary hover:text-[1.05rem] transition-all duration-200" 
              onClick={() => setIsConfirmResetModalOpen(true)}
              disabled={user.role === 'SYSTEM_ADMINISTRATOR'}
            >
              Send Password Reset
            </MD3Button>
          </div>
        </div>
      </MD3Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmResetModalOpen}
        onClose={() => setIsConfirmResetModalOpen(false)}
        title="Confirm Password Reset"
        footer={
          <div className="flex gap-3">
            <MD3Button variant="text" onClick={() => setIsConfirmResetModalOpen(false)}>
              Cancel
            </MD3Button>
            <MD3Button 
              onClick={handleResetPassword}
              disabled={isResettingPassword}
            >
              {isResettingPassword ? 'Resetting...' : 'Confirm & Reset'}
            </MD3Button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-sm text-md-on-surface">
          <p>
            Are you sure you want to reset the password for <strong>{user.name}</strong> ({user.email})?
          </p>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-900 dark:text-amber-200">
            A new policy-compliant temporary password will be generated and dispatched to the user's email. 
            The user will be required to change this temporary password upon their next login.
          </div>
        </div>
      </Modal>

      {/* Temporary Password Result Modal */}
      <Modal
        isOpen={!!tempPasswordResult}
        onClose={() => setTempPasswordResult(null)}
        title="Temporary Password Generated"
        footer={
          <div className="flex justify-end">
            <MD3Button onClick={() => setTempPasswordResult(null)}>
              Done
            </MD3Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
            <CheckCircle size={18} />
            <span>Credentials dispatched to <strong>{user.email}</strong></span>
          </div>

          <p className="text-xs text-md-on-surface-variant">
            You may also provide the temporary password directly to the user if they cannot access their email:
          </p>

          <div className="flex items-center justify-between p-3.5 bg-md-surface-container rounded-xl border border-md-outline/20 font-mono text-sm">
            <span className="font-bold tracking-wider text-md-primary select-all">
              {tempPasswordResult}
            </span>
            <MD3Button 
              variant="outlined" 
              className="h-8 text-xs px-3"
              onClick={() => tempPasswordResult && copyTemporaryPassword(tempPasswordResult)}
            >
              {copiedPass ? (
                <>
                  <Check size={14} className="mr-1 text-green-500" /> Copied
                </>
              ) : (
                <>
                  <Copy size={14} className="mr-1" /> Copy
                </>
              )}
            </MD3Button>
          </div>

          <div className="text-[11px] text-md-on-surface-variant/70">
            Note: The account has been flagged with first-login password rotation enforcement.
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserDetails;
