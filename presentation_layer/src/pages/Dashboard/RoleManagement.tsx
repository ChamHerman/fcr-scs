import React, { useState, useEffect } from 'react';
import { MD3Card, MD3Button } from '../MD3Components';
import { ADMIN_PAGES, type AdminPageInfo } from '../../constants/pages';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import '../LandAcquisition/case_management.css';
import { Check, Save } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../components/ui/NotificationSystem';

const ROLES = [
  'SYSTEM_ADMINISTRATOR',
  'GOVERNMENT_ADMINISTRATOR',
  'GOVERNMENT_OFFICER',
  'LAND_VALUER',
  'DISPLACED_COMMUNITY_MEMBER'
];

const getDefaultPermissions = (role: string): string[] => {
  switch (role) {
    case 'SYSTEM_ADMINISTRATOR':
      return ADMIN_PAGES.map(p => p.path);
    case 'GOVERNMENT_ADMINISTRATOR':
      return ADMIN_PAGES.filter(p => 
        !p.path.startsWith('/member') && 
        !['/admin/users', '/admin/role-management', '/admin/email-templates', '/admin/audit-logs'].includes(p.path)
      ).map(p => p.path);
    case 'GOVERNMENT_OFFICER':
      return [
        '/admin',
        '/admin/case',
        '/admin/case/valuation',
        '/admin/compensation/report',
        '/admin/compensation/offer',
        '/admin/compensation/objection',
        '/admin/prediction',
        '/admin/reports',
        '/admin/reports/case-status',
        '/admin/profile',
        '/admin/alerts',
      ];
    case 'LAND_VALUER':
      return [
        '/admin',
        '/admin/case',
        '/admin/case/valuation',
        '/admin/prediction',
        '/admin/profile',
        '/admin/alerts',
      ];
    case 'DISPLACED_COMMUNITY_MEMBER':
      return ADMIN_PAGES.filter(p => p.path.startsWith('/member')).map(p => p.path);
    default:
      return [];
  }
};

export const RoleManagement: React.FC = () => {
  useDocumentTitle('Role Management');
  const { notify } = useNotification();
  const [selectedRole, setSelectedRole] = useState<string>(ROLES[1]); // Default to GOVERNMENT_ADMINISTRATOR
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchPermissions(selectedRole);
  }, [selectedRole]);

  const fetchPermissions = async (role: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/users/permissions/${role}`);
      const data = res.data;
      const permMap: Record<string, boolean> = {};
      
      // Initialize all pages to false unless fetched otherwise
      ADMIN_PAGES.forEach(page => {
        permMap[page.path] = false;
      });

      if (data?.success && data?.data && data.data.length > 0) {
        data.data.forEach((p: any) => {
          if (permMap[p.pagePath] !== undefined) {
            permMap[p.pagePath] = p.canAccess;
          }
        });
      } else {
        // Initialize with default permissions if no saved permissions exist
        const defaultPaths = getDefaultPermissions(role);
        defaultPaths.forEach(path => {
          if (permMap[path] !== undefined) {
            permMap[path] = true;
          }
        });
      }
      setPermissions(permMap);
    } catch (e) {
      console.error('Failed to fetch permissions', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (path: string) => {
    if (selectedRole === 'SYSTEM_ADMINISTRATOR') return; // Cannot modify system admin
    if (path === '/admin/role-management') return; // Strictly reserved for system admin
    if (selectedRole !== 'GOVERNMENT_ADMINISTRATOR' && (path.startsWith('/admin/payment') || path.startsWith('/admin/blockchain'))) return; // Strictly for GA
    if (selectedRole === 'DISPLACED_COMMUNITY_MEMBER' && !path.startsWith('/member')) return; // Member cannot access admin portal
    if (selectedRole !== 'DISPLACED_COMMUNITY_MEMBER' && path.startsWith('/member')) return; // Admin roles cannot access member portal

    setPermissions(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleToggleCategory = (categoryPages: AdminPageInfo[]) => {
    if (selectedRole === 'SYSTEM_ADMINISTRATOR') return;
    if (selectedRole !== 'GOVERNMENT_ADMINISTRATOR' && categoryPages.some(p => p.category === 'Finance & Ledger')) return;
    if (selectedRole !== 'DISPLACED_COMMUNITY_MEMBER' && categoryPages.some(p => p.category === 'Member Portal')) return;
    if (selectedRole === 'DISPLACED_COMMUNITY_MEMBER' && categoryPages.some(p => p.category !== 'Member Portal')) return;

    const modifiablePages = categoryPages.filter(p => {
      if (p.path === '/admin/role-management') return false;
      if (selectedRole !== 'GOVERNMENT_ADMINISTRATOR' && p.category === 'Finance & Ledger') return false;
      if (selectedRole !== 'DISPLACED_COMMUNITY_MEMBER' && p.category === 'Member Portal') return false;
      if (selectedRole === 'DISPLACED_COMMUNITY_MEMBER' && p.category !== 'Member Portal') return false;
      return true;
    });

    const allEnabled = modifiablePages.every(page => !!permissions[page.path]);
    setPermissions(prev => {
      const updated = { ...prev };
      modifiablePages.forEach(page => {
        updated[page.path] = !allEnabled;
      });
      return updated;
    });
  };

  const handleSave = async () => {
    if (selectedRole === 'SYSTEM_ADMINISTRATOR') return;
    
    setLoading(true);
    const payload = Object.keys(permissions).map(path => ({
      pagePath: path,
      canAccess: permissions[path]
    }));

    try {
      const res = await api.post(`/users/permissions/${selectedRole}`, { permissions: payload });
      if (res.data?.success || res.status === 200) {
        notify({
          type: 'success',
          title: 'Permissions Updated',
          message: `Permissions for ${selectedRole.replace(/_/g, ' ')} have been saved successfully.`
        });
      } else {
        notify({
          type: 'error',
          title: 'Save Failed',
          message: res.data?.message || 'Failed to save role permissions.'
        });
      }
    } catch (e: any) {
      console.error(e);
      notify({
        type: 'error',
        title: 'Error Saving Permissions',
        message: e?.response?.data?.message || e.message || 'An unexpected error occurred while saving.'
      });
    } finally {
      setLoading(false);
    }
  };

  const groupedPages = ADMIN_PAGES.reduce((acc, page) => {
    if (!acc[page.category]) acc[page.category] = [];
    acc[page.category].push(page);
    return acc;
  }, {} as Record<string, AdminPageInfo[]>);

  const isSysAdmin = selectedRole === 'SYSTEM_ADMINISTRATOR';

  return (
    <div className="main blur-shape-bg">
      <PageHeader
        title="Role Management"
        subtitle="Configure access control for different system roles."
      />

      <MD3Card elevation={1}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-xl font-medium text-md-on-surface">Role Permissions</h2>
          <p className="text-md-on-surface-variant text-sm mt-1">Manage page-level access for each system role.</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-4 items-center">
          <div className="w-64">
            <Select 
              label="Role"
              options={ROLES.map(r => ({ value: r, label: r.replace(/_/g, ' ') }))}
              value={selectedRole}
              onChange={setSelectedRole}
              placeholder="Select Role"
            />
          </div>
          <MD3Button 
            onClick={handleSave} 
            disabled={isSysAdmin || loading}
            icon={<Save size={18} />}
          >
            Save Changes
          </MD3Button>
        </div>
      </div>

      {isSysAdmin && (
        <div className="mb-6 p-4 bg-md-tertiary-container text-md-on-tertiary-container rounded-xl flex items-center gap-3">
          <Check size={20} />
          <span className="text-sm font-medium">System Administrators have implicit access to all pages. These permissions cannot be modified.</span>
        </div>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {Object.entries(groupedPages).map(([category, pages]) => {
          const isCategoryDisabled =
            isSysAdmin ||
            (selectedRole !== 'GOVERNMENT_ADMINISTRATOR' && category === 'Finance & Ledger') ||
            (selectedRole !== 'DISPLACED_COMMUNITY_MEMBER' && category === 'Member Portal') ||
            (selectedRole === 'DISPLACED_COMMUNITY_MEMBER' && category !== 'Member Portal');

          const allChecked = isSysAdmin ? true : (isCategoryDisabled ? false : pages.every(p => !!permissions[p.path]));

          return (
            <div key={category} className="flex flex-col gap-3">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-md-outline/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-6 bg-md-primary rounded-full"></div>
                  <h3 className="font-semibold text-sm tracking-wide text-md-on-surface uppercase opacity-80">{category}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCategory(pages)}
                  disabled={isCategoryDisabled}
                  title={allChecked ? `Deselect all in ${category}` : `Select all in ${category}`}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-all duration-200 border flex items-center gap-1.5 ${
                    isCategoryDisabled
                      ? 'opacity-40 cursor-not-allowed border-transparent text-md-on-surface-variant'
                      : allChecked
                      ? 'bg-md-primary/10 text-md-primary border-md-primary/30 hover:bg-md-primary/20'
                      : 'bg-md-surface-variant/40 text-md-on-surface-variant border-md-outline/20 hover:bg-md-surface-variant hover:text-md-on-surface active:scale-95'
                  }`}
                >
                  <Check size={13} className={allChecked ? "opacity-100 text-md-primary" : "opacity-40"} />
                  <span>{allChecked ? 'Deselect All' : 'Select All'}</span>
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                {pages.map(page => {
                  const isRoleMgmtLocked = page.path === '/admin/role-management';
                  const isFinanceLocked = page.category === 'Finance & Ledger' && selectedRole !== 'GOVERNMENT_ADMINISTRATOR';
                  const isMemberOnlyLocked = page.category === 'Member Portal' && selectedRole !== 'DISPLACED_COMMUNITY_MEMBER';
                  const isAdminOnlyLocked = page.category !== 'Member Portal' && selectedRole === 'DISPLACED_COMMUNITY_MEMBER';
                  const isDisabled = isSysAdmin || isRoleMgmtLocked || isFinanceLocked || isMemberOnlyLocked || isAdminOnlyLocked;
                  const checked = isSysAdmin ? true : (isRoleMgmtLocked || isFinanceLocked || isMemberOnlyLocked || isAdminOnlyLocked ? false : !!permissions[page.path]);
                  return (
                    <label 
                      key={page.path} 
                      className={`group relative flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border
                        ${checked 
                          ? 'bg-md-primary-container/20 border-md-primary/20 shadow-sm' 
                          : 'bg-md-surface hover:bg-md-surface-variant/10 border-md-outline/10'} 
                        ${!isDisabled ? 'cursor-pointer hover:shadow-md' : 'opacity-60 cursor-not-allowed'}`}
                    >
                      <div className="flex flex-col pr-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold transition-colors ${checked ? 'text-md-on-surface' : 'text-md-on-surface-variant'}`}>
                            {page.name}
                          </span>
                          {isRoleMgmtLocked && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-md-outline/15 text-md-on-surface-variant">
                              SysAdmin Only
                            </span>
                          )}
                          {isFinanceLocked && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-md-outline/15 text-md-on-surface-variant">
                              GovAdmin Only
                            </span>
                          )}
                          {isMemberOnlyLocked && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-md-outline/15 text-md-on-surface-variant">
                              Member Only
                            </span>
                          )}
                          {isAdminOnlyLocked && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-md-outline/15 text-md-on-surface-variant">
                              Admin Only
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-md-on-surface-variant/70 mt-1 truncate max-w-[200px]" title={page.path}>
                          {page.path}
                        </span>
                      </div>

                      <div className="flex-shrink-0">
                        <div className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors duration-200 ease-in-out ${checked ? 'bg-md-primary border-md-primary' : 'bg-transparent border-md-outline/50 group-hover:border-md-outline'}`}>
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full transition duration-200 ease-in-out shadow-sm ${checked ? 'translate-x-[22px] bg-white' : 'translate-x-0.5 bg-md-outline/60 group-hover:bg-md-outline'}`} />
                        </div>
                      </div>
                      
                      <input 
                        type="checkbox" 
                        className="sr-only"
                        checked={checked}
                        onChange={() => handleToggle(page.path)}
                        disabled={isDisabled}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      </MD3Card>
    </div>
  );
};
